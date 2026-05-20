"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function toggleFavorite(idToken: string, appId: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) throw new Error("Unauthorized");
        if (!adminDb) throw new Error("Database not initialized");

        const favRef = adminDb.collection("users").doc(user.uid).collection("favorites").doc(appId);
        const doc = await favRef.get();

        if (doc.exists) {
            await favRef.delete();
        } else {
            await favRef.set({
                createdAt: new Date().toISOString()
            });
        }

        revalidatePath("/");
        return { success: true, isFavorite: !doc.exists };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to toggle favorite";
        return { success: false, message };
    }
}

export async function logRecentApp(idToken: string, appId: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) throw new Error("Unauthorized");
        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("users").doc(user.uid).collection("recent").doc(appId).set({
            lastOpenedAt: new Date().toISOString()
        });

        revalidatePath("/");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to log recent app";
        return { success: false, message };
    }
}
