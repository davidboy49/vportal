"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { SettingsSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function updateSettings(idToken: string, data: any) {
    try {
        await verifyAdmin(idToken);
        const validated = SettingsSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("settings").doc("global").set(validated, { merge: true });

        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function getSettings() {
    if (!adminDb) return null;
    const doc = await adminDb.collection("settings").doc("global").get();
    if (doc.exists) {
        return doc.data();
    }
    return null;
}
