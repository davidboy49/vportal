"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateSettings } from "@/actions/settings";
import { Loader2 } from "lucide-react";

export default function AdminSettingsPage({ initialSettings }: { initialSettings: any }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [portalName, setPortalName] = useState(initialSettings?.portalName || "App Portal");
    const [logoUrl, setLogoUrl] = useState(initialSettings?.logoUrl || "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const token = await user.getIdToken();
            await updateSettings(token, { portalName, logoUrl });
            alert("Settings saved!");
        } catch (error) {
            console.error(error);
            alert("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold">Global Settings</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Portal Name</Label>
                    <Input value={portalName} onChange={e => setPortalName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                    {logoUrl && <img src={logoUrl} alt="Logo Preview" className="h-10 mt-2 object-contain" />}
                </div>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                </Button>
            </form>
        </div>
    );
}
