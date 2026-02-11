"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
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
        await verifyAdmin(idToken);
        const validated = CategorySchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        const docRef = await adminDb.collection("categories").add(validated);

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true, id: docRef.id };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateCategory(idToken: string, catId: string, data: any) {
    try {
        await verifyAdmin(idToken);
        const validated = CategorySchema.parse(data);

        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("categories").doc(catId).update(validated);

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteCategory(idToken: string, catId: string) {
    try {
        await verifyAdmin(idToken);
        if (!adminDb) throw new Error("Database not initialized");

        await adminDb.collection("categories").doc(catId).delete();

        revalidatePath("/admin/categories");
        revalidatePath("/");
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
