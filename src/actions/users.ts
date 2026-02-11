"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
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

        // We might want to merge with Firestore data if available, 
        // but for now returning auth users is sufficient for listing.
        // Ideally, we fetch from Firestore 'users' collection to get roles more easily if synced.

        // Let's fetch Firestore users to get roles
        if (!adminDb) throw new Error("Database not initialized");
        const snapshot = await adminDb.collection("users").limit(limit).get();
        const dbUsers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

        // Map Auth users to combine with DB data
        const users = listUsersResult.users.map(u => {
            const dbUser: any = dbUsers.find((du: any) => du.uid === u.uid) || {};
            return {
                uid: u.uid,
                email: u.email,
                displayName: u.displayName,
                photoURL: u.photoURL,
                role: dbUser.role || "USER", // fallback
                lastSignInTime: u.metadata.lastSignInTime,
                creationTime: u.metadata.creationTime,
            };
        });

        return { success: true, users };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function setUserRole(idToken: string, targetUid: string, role: "ADMIN" | "USER") {
    try {
        await verifyAdmin(idToken);
        if (!adminAuth || !adminDb) throw new Error("Firebase Admin not initialized");

        // Set custom claim
        await adminAuth.setCustomUserClaims(targetUid, { role });

        // Update Firestore
        await adminDb.collection("users").doc(targetUid).set({ role }, { merge: true });

        revalidatePath("/admin/users");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
