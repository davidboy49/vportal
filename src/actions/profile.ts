"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

// Avatars are resized client-side to 256x256 before upload, so a real one is
// well under this; the cap just keeps the users/{uid} doc small.
const MAX_AVATAR_CHARS = 300 * 1024;
const AVATAR_DATA_URI = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/;

/** Sets (or, with null, clears) the user's custom avatar on users/{uid}.avatarUrl. */
export async function setUserAvatar(idToken: string, avatarUrl: string | null) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) throw new Error("Unauthorized");
        if (!adminDb) throw new Error("Database not initialized");

        if (avatarUrl !== null) {
            if (avatarUrl.length > MAX_AVATAR_CHARS) {
                return { success: false, message: "Image is too large." };
            }
            if (!AVATAR_DATA_URI.test(avatarUrl)) {
                return { success: false, message: "Unsupported image format." };
            }
        }

        await adminDb.collection("users").doc(user.uid).set(
            { avatarUrl: avatarUrl ?? FieldValue.delete() },
            { merge: true }
        );
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update avatar";
        return { success: false, message };
    }
}
