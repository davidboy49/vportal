"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { logAdminChange } from "@/lib/admin-change-log";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function getUsers(idToken: string, limit = 50) {
    try {
        await verifyAdmin(idToken);
        if (!adminAuth) throw new Error("Auth not initialized");

        const listUsersResult = await adminAuth.listUsers(limit);

        const db = adminDb;
        if (!db) throw new Error("Database not initialized");
        
        // Fetch Firestore documents matching the specific UIDs retrieved from Auth
        const uids = listUsersResult.users.map(u => u.uid);
        let dbUsers: { uid: string; role?: string }[] = [];

        if (uids.length > 0) {
            const docRefs = uids.map(uid => db.collection("users").doc(uid));
            const docs = await db.getAll(...docRefs);
            dbUsers = docs.map(doc => ({
                uid: doc.id,
                ...(doc.exists ? doc.data() : {})
            }));
        }

        const users = listUsersResult.users.map(u => {
            const dbUser = dbUsers.find(du => du.uid === u.uid);
            return {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
                role: dbUser?.role || "USER", // fallback
                lastSignInTime: u.metadata.lastSignInTime,
                creationTime: u.metadata.creationTime,
                disabled: u.disabled,
            };
        });

        return { success: true, users };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to get users";
        return { success: false, message };
    }
}

export async function setUserRole(idToken: string, targetUid: string, role: "ADMIN" | "USER") {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminAuth || !adminDb) throw new Error("Firebase Admin not initialized");

        // Set custom claim
        await adminAuth.setCustomUserClaims(targetUid, { role });

        // Update Firestore
        await adminDb.collection("users").doc(targetUid).set({ role }, { merge: true });

        await logAdminChange(admin, {
            action: "SET_USER_ROLE",
            targetType: "user",
            targetId: targetUid,
            message: `Updated user ${targetUid} role to ${role}`,
            metadata: { role },
        });

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to set user role";
        return { success: false, message };
    }
}

export async function createUserAction(
    idToken: string,
    data: {
        email: string;
        password: string;
        displayName?: string;
        role: "ADMIN" | "USER";
    }
) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminAuth || !adminDb) throw new Error("Firebase Admin not initialized");

        // Create Firebase Auth user
        const userRecord = await adminAuth.createUser({
            email: data.email,
            password: data.password,
            displayName: data.displayName,
        });

        const targetUid = userRecord.uid;

        // Set custom claims role
        await adminAuth.setCustomUserClaims(targetUid, { role: data.role });

        // Create Firestore user doc
        await adminDb.collection("users").doc(targetUid).set({
            role: data.role,
            createdAt: new Date().toISOString()
        });

        await logAdminChange(admin, {
            action: "CREATE_USER",
            targetType: "user",
            targetId: targetUid,
            message: `Created user ${data.email} (${targetUid}) with role ${data.role}`,
            metadata: { email: data.email, role: data.role },
        });

        revalidatePath("/admin/users");
        return { success: true, uid: targetUid };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to create user";
        return { success: false, message };
    }
}

export async function changeUserPasswordAction(
    idToken: string,
    targetUid: string,
    newPassword: string
) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminAuth) throw new Error("Firebase Admin not initialized");

        // Update password
        await adminAuth.updateUser(targetUid, { password: newPassword });

        await logAdminChange(admin, {
            action: "CHANGE_PASSWORD",
            targetType: "user",
            targetId: targetUid,
            message: `Changed password for user ${targetUid}`,
        });

        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to change password";
        return { success: false, message };
    }
}

export async function toggleUserStatusAction(idToken: string, targetUid: string, disabled: boolean) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminAuth) throw new Error("Firebase Admin not initialized");

        await adminAuth.updateUser(targetUid, { disabled });

        await logAdminChange(admin, {
            action: "TOGGLE_USER_STATUS",
            targetType: "user",
            targetId: targetUid,
            message: `User ${targetUid} has been ${disabled ? "disabled" : "enabled"}`,
            metadata: { disabled },
        });

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to toggle user status";
        return { success: false, message };
    }
}

export async function deleteUsersAction(idToken: string, targetUids: string[]) {
    try {
        const admin = await verifyAdmin(idToken);
        const db = adminDb;
        if (!adminAuth || !db) throw new Error("Firebase Admin not initialized");

        // Delete from Auth
        const deleteResult = await adminAuth.deleteUsers(targetUids);
        
        // Delete from Firestore
        const batch = db.batch();
        targetUids.forEach((uid) => {
            const ref = db.collection("users").doc(uid);
            batch.delete(ref);
        });
        await batch.commit();

        await logAdminChange(admin, {
            action: "DELETE_USERS",
            targetType: "user",
            targetId: targetUids.length === 1 ? targetUids[0] : "BULK",
            message: `Deleted ${targetUids.length} user(s). Failed: ${deleteResult.failureCount}`,
            metadata: { targetUids, deleteResult },
        });

        revalidatePath("/admin/users");
        return { success: true, failureCount: deleteResult.failureCount };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to delete users";
        return { success: false, message };
    }
}
