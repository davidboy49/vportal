import { AppsClient } from "./client";
import { getApps, getCategories } from "@/lib/data";

export default async function AdminAppsPage() {
    const apps = await getApps();
    const categories = await getCategories();

    return <AppsClient initialApps={apps} categories={categories} />;
}
