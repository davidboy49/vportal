"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateSettings } from "@/actions/settings";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";

function StatusBanner({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
    const isSuccess = type === "success";
    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            isSuccess
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        }`}>
            {isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <span className="flex-1 font-medium">{message}</span>
            <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 transition-opacity text-xs font-bold">✕</button>
        </div>
    );
}

export default function AdminSettingsPage({ initialSettings }: { initialSettings: { portalName?: string; logoUrl?: string } | null }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [portalName, setPortalName] = useState(initialSettings?.portalName || "App Portal");
    const [logoUrl, setLogoUrl] = useState(initialSettings?.logoUrl || "");
    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setBanner(null);

        try {
            const token = await user.getIdToken();
            await updateSettings(token, { portalName, logoUrl });
            setBanner({ message: "Settings saved successfully.", type: "success" });
        } catch (error) {
            console.error(error);
            setBanner({ message: "Failed to save settings. Please try again.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-6">
            <h2 className="text-2xl font-bold">Global Settings</h2>

            {banner && (
                <StatusBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />
            )}

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
    );
}
