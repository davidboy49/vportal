import AdminSettingsClient from "./client"; // Fixed default import
import { getSettings } from "@/actions/settings";

export default async function AdminSettingsPage() {
    const settings = await getSettings();
    return <AdminSettingsClient initialSettings={settings} />;
}
