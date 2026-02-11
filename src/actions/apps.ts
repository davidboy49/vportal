"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { AppSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function createApp(idToken: string, data: any) {
    try {
        await verifyAdmin(idToken);

        // Validate data manually since FormData handling is tricky with Zod sometimes, 
        // or just assume data is a plain object here if passed from a client component that handled form state
        const validated = AppSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        const docRef = await adminDb.collection("apps").add({
            ...validated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        revalidatePath("/admin/apps");
        revalidatePath("/"); // Update dashboard
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateApp(idToken: string, appId: string, data: any) {
    try {
        await verifyAdmin(idToken);
        const validated = AppSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("apps").doc(appId).update({
            ...validated,
            updatedAt: new Date().toISOString(),
        });

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteApp(idToken: string, appId: string) {
    try {
        await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("apps").doc(appId).delete();

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
