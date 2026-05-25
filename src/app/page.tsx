import { getApps, getCategories } from "@/lib/data";
import { getSettings } from "@/actions/settings";
import { DashboardClient } from "@/components/dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const apps = await getApps();
  const categories = await getCategories();
  const settings = await getSettings();

  return (
    <DashboardClient
      initialApps={apps}
      categories={categories}
      globalSettings={settings || undefined}
    />
  );
}

