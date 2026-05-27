"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function getChatLogs(idToken: string, limitVal = 100) {
    try {
        await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");

        const snapshot = await adminDb
            .collection("chats")
            .orderBy("lastMessageAt", "desc")
            .limit(limitVal)
            .get();

        const logs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return { success: true, logs };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to fetch chat logs";
        return { success: false, message };
    }
}
