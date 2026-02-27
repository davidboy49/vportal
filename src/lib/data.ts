import { adminDb } from "./firebase/admin";
import { App, Category } from "./types";

export async function getApps(): Promise<App[]> {
    if (!adminDb) return [];

    const snapshot = await adminDb.collection("apps")
        .where("isActive", "==", true)
        // .orderBy("createdAt", "desc") // requires index
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as App));
}

export async function getCategories(): Promise<Category[]> {
    if (!adminDb) return [];

    const snapshot = await adminDb.collection("categories")
        .where("isActive", "==", true)
        .orderBy("sortOrder", "asc")
        .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
}

export async function getUserData(uid: string) {
    if (!adminDb) return null;

    // Parallel fetch favorites and recent
    const [favSnap, recentSnap] = await Promise.all([
        adminDb.collection("users").doc(uid).collection("favorites").get(),
        adminDb.collection("users").doc(uid).collection("recent").orderBy("lastOpenedAt", "desc").limit(10).get()
    ]);

    return {
        favorites: favSnap.docs.map(doc => doc.id),
        recent: recentSnap.docs.map(doc => doc.id)
    };
}
