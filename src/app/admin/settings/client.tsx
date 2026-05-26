"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateSettings } from "@/actions/settings";
import { Loader2, Settings } from "lucide-react";
import { AdminHeader } from "@/components/admin-header";

import Image from "next/image";

export default function AdminSettingsPage({ initialSettings }: { initialSettings: { portalName?: string; logoUrl?: string } | null }) {
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
        <div className="space-y-6">
            <AdminHeader 
                title="Portal Settings"
                description="Configure global application details and portal assets."
                icon={Settings}
            />
            
            <div className="max-w-2xl bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
                <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label>Portal Name</Label>
                    <Input value={portalName} onChange={e => setPortalName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label>Logo URL</Label>
                    <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
                    {logoUrl && <Image src={logoUrl} alt="Logo Preview" width={120} height={40} unoptimized className="h-10 mt-2 object-contain w-auto" />}
                </div>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                </Button>
                </form>
            </div>
        </div>
    );
}
