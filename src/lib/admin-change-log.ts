import { DecodedIdToken } from "firebase-admin/auth";
import { adminDb } from "@/lib/firebase/admin";

export type AdminChangeLogInput = {
    action: string;
    targetType: "app" | "category" | "user" | "settings" | "system";
    targetId?: string;
    message: string;
    metadata?: Record<string, unknown>;
};

export async function logAdminChange(actor: DecodedIdToken, payload: AdminChangeLogInput) {
    if (!adminDb) return;

    await adminDb.collection("adminChangeLogs").add({
        ...payload,
        actorUid: actor.uid,
        actorEmail: actor.email || null,
        createdAt: new Date().toISOString(),
    });
}
