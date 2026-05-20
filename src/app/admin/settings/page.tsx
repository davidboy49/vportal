import AdminSettingsClient from "./client"; // Fixed default import
import { getSettings } from "@/actions/settings";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
    const settings = await getSettings() as { portalName?: string; logoUrl?: string } | null;
    return <AdminSettingsClient initialSettings={settings} />;
}
