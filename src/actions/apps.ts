"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { logAdminChange } from "@/lib/admin-change-log";
import { AppSchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function createApp(idToken: string, data: unknown) {
    try {
        const admin = await verifyAdmin(idToken);

        // Validate data manually since FormData handling is tricky with Zod sometimes, 
        // or just assume data is a plain object here if passed from a client component that handled form state
        const validated = AppSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        const docRef = await adminDb.collection("apps").add({
            ...validated,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        await logAdminChange(admin, {
            action: "CREATE_APP",
            targetType: "app",
            targetId: docRef.id,
            message: `Created app \"${validated.name}\"`,
            metadata: { name: validated.name, categoryId: validated.categoryId },
        });

        revalidatePath("/admin/apps");
        revalidatePath("/"); // Update dashboard
        return { success: true, id: docRef.id };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to create app";
        return { success: false, message };
    }
}

export async function updateApp(idToken: string, appId: string, data: unknown) {
    try {
        const admin = await verifyAdmin(idToken);
        const validated = AppSchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("apps").doc(appId).update({
            ...validated,
            updatedAt: new Date().toISOString(),
        });

        await logAdminChange(admin, {
            action: "UPDATE_APP",
            targetType: "app",
            targetId: appId,
            message: `Updated app \"${validated.name}\"`,
            metadata: { name: validated.name, categoryId: validated.categoryId },
        });

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to update app";
        return { success: false, message };
    }
}

export async function deleteApp(idToken: string, appId: string) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("apps").doc(appId).delete();

        await logAdminChange(admin, {
            action: "DELETE_APP",
            targetType: "app",
            targetId: appId,
            message: `Deleted app ${appId}`,
        });

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to delete app";
        return { success: false, message };
    }
}
