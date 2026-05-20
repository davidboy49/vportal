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
