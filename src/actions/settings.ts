"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { logAdminChange } from "@/lib/admin-change-log";
import { SettingsSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function updateSettings(idToken: string, data: unknown) {
    try {
        const admin = await verifyAdmin(idToken);
        const validated = SettingsSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("settings").doc("global").set(validated, { merge: true });

        await logAdminChange(admin, {
            action: "UPDATE_SETTINGS",
            targetType: "settings",
            targetId: "global",
            message: "Updated global portal settings",
            metadata: validated,
        });

        revalidatePath("/");
        revalidatePath("/admin/settings");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update settings";
        return { success: false, message };
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
