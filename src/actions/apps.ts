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
        const validated = AppSchema.partial().parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        // Clean undefined fields so they aren't sent to Firestore
        const cleanData: Record<string, any> = {};
        for (const [key, value] of Object.entries(validated)) {
            if (value !== undefined) {
                cleanData[key] = value;
            }
        }

        await adminDb.collection("apps").doc(appId).update({
            ...cleanData,
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

export async function bulkUpdateApps(idToken: string, appIds: string[], patch: { isActive?: boolean; visibility?: "PUBLIC" | "ADMIN_ONLY" }) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");
        if (appIds.length === 0) return { success: true };

        const batch = adminDb.batch();
        for (const appId of appIds) {
            batch.update(adminDb.collection("apps").doc(appId), {
                ...patch,
                updatedAt: new Date().toISOString(),
            });
        }
        await batch.commit();

        await logAdminChange(admin, {
            action: "BULK_UPDATE_APPS",
            targetType: "app",
            targetId: appIds.join(","),
            message: `Bulk updated ${appIds.length} app(s): ${JSON.stringify(patch)}`,
            metadata: { count: appIds.length, patch },
        });

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to bulk update apps";
        return { success: false, message };
    }
}

export async function bulkDeleteApps(idToken: string, appIds: string[]) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");
        if (appIds.length === 0) return { success: true };

        const batch = adminDb.batch();
        for (const appId of appIds) {
            batch.delete(adminDb.collection("apps").doc(appId));
        }
        await batch.commit();

        await logAdminChange(admin, {
            action: "BULK_DELETE_APPS",
            targetType: "app",
            targetId: appIds.join(","),
            message: `Bulk deleted ${appIds.length} app(s)`,
            metadata: { count: appIds.length },
        });

        revalidatePath("/admin/apps");
        revalidatePath("/");
        return { success: true };
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to bulk delete apps";
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
