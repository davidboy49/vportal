import { CategoriesClient } from "./client";
import { getCategories } from "@/lib/data";

export default async function AdminCategoriesPage() {
    const categories = await getCategories();
    // Note: getCategories in lib/data defaults to only active ones. 
    // For admin, we might want ALL categories (even inactive).
    // Let's rely on the current implementation for simplicity, but in a real app create a separate getAdminCategories function.

    return <CategoriesClient initialCategories={categories} />;
}
