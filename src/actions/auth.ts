"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";

export async function bootstrapAdmin(idToken: string) {
    const user = await verifyIdToken(idToken);

    if (!user) {
        return { success: false, message: "Not authenticated" };
    }

    const adminEmail = process.env.ADMIN_EMAIL;

    console.log(`Checking bootstrap for ${user.email}. Target admin: ${adminEmail}`);

    if (user.email === adminEmail) {
        try {
            if (!adminAuth || !adminDb) {
                console.error("Firebase Admin NOT initialized during bootstrap attempt");
                throw new Error("Firebase Admin not initialized");
            }

            // Set custom claim
            await adminAuth.setCustomUserClaims(user.uid, { role: "ADMIN" });

            // Create/Update user document in Firestore
            await adminDb.collection("users").doc(user.uid).set({
                email: user.email,
                role: "ADMIN",
                lastLogin: new Date().toISOString(),
            }, { merge: true });

            return { success: true, message: "Admin role assigned" };
        } catch (error: any) {
            console.error("Error bootstrapping admin:", error);
            return { success: false, message: error.message };
        }
    }

    return { success: false, message: "User is not the designated admin" };
}

export async function syncUser(idToken: string) {
    const user = await verifyIdToken(idToken);
    if (!user) return;

    if (!adminDb) return;

    // Sync basic user info to Firestore if not exists or update last login
    const userRef = adminDb.collection("users").doc(user.uid);
    const doc = await userRef.get();

    if (!doc.exists) {
        await userRef.set({
            email: user.email,
            role: "USER",
            createdAt: new Date().toISOString(),
        });
    } else {
        // optional: update last login
    }
}
