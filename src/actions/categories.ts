"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { logAdminChange } from "@/lib/admin-change-log";
import { CategorySchema } from "@/lib/schemas";
import { revalidatePath } from "next/cache";

async function verifyAdmin(idToken: string) {
    const decodedToken = await verifyIdToken(idToken);
    if (!decodedToken || decodedToken.role !== "ADMIN") {
        throw new Error("Unauthorized: Admin access required");
    }
    return decodedToken;
}

export async function createCategory(idToken: string, data: any) {
    try {
        const admin = await verifyAdmin(idToken);
        const validated = CategorySchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        const docRef = await adminDb.collection("categories").add(validated);

        await logAdminChange(admin, {
            action: "CREATE_CATEGORY",
            targetType: "category",
            targetId: docRef.id,
            message: `Created category \"${validated.name}\"`,
            metadata: { name: validated.name, isActive: validated.isActive },
        });

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateCategory(idToken: string, catId: string, data: any) {
    try {
        const admin = await verifyAdmin(idToken);
        const validated = CategorySchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("categories").doc(catId).update(validated);

        await logAdminChange(admin, {
            action: "UPDATE_CATEGORY",
            targetType: "category",
            targetId: catId,
            message: `Updated category \"${validated.name}\"`,
            metadata: { name: validated.name, isActive: validated.isActive },
        });

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteCategory(idToken: string, catId: string) {
    try {
        const admin = await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("categories").doc(catId).delete();

        await logAdminChange(admin, {
            action: "DELETE_CATEGORY",
            targetType: "category",
            targetId: catId,
            message: `Deleted category ${catId}`,
        });

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
