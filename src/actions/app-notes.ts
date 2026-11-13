"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { APP_NOTE_FIELDS, AppNote } from "@/lib/app-notes";

const MAX_FIELD_CHARS = 2000;
const APP_ID = /^[A-Za-z0-9_-]{1,128}$/;

/**
 * Saves the signed-in user's private login notes for one app to
 * users/{uid}/appNotes/{appId}. Saving an all-empty note deletes it.
 */
export async function saveAppNote(idToken: string, appId: string, note: AppNote) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) throw new Error("Unauthorized");
        if (!adminDb) throw new Error("Database not initialized");
        if (!APP_ID.test(appId)) return { success: false, message: "Invalid app." };

        const clean: AppNote = {};
        for (const field of APP_NOTE_FIELDS) {
            const value = note[field];
            if (typeof value !== "string") continue;
            const trimmed = value.trim();
            if (!trimmed) continue;
            if (trimmed.length > MAX_FIELD_CHARS) return { success: false, message: "A field is too long." };
            clean[field] = trimmed;
        }

        const ref = adminDb.collection("users").doc(user.uid).collection("appNotes").doc(appId);
        if (Object.keys(clean).length === 0) {
            await ref.delete();
        } else {
            await ref.set({ ...clean, updatedAt: new Date().toISOString() });
        }
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to save notes";
        return { success: false, message };
    }
}
