"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { updateSettings } from "@/actions/settings";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import {
    resolveSeasonalEffect,
    SEASONAL_EFFECT_LABELS,
    SEASONAL_EFFECT_SETTINGS,
    SeasonalEffectSetting,
    SeasonalSettings,
} from "@/lib/seasonal";

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

const SELECT_CLASS =
    "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

export default function AdminSettingsPage({ initialSettings }: { initialSettings: (SeasonalSettings & { portalName?: string; logoUrl?: string }) | null }) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [portalName, setPortalName] = useState(initialSettings?.portalName || "App Portal");
    const [logoUrl, setLogoUrl] = useState(initialSettings?.logoUrl || "");
    const [seasonalEffect, setSeasonalEffect] = useState<SeasonalEffectSetting>(initialSettings?.seasonalEffect || "auto");
    const [khmerNewYearStart, setKhmerNewYearStart] = useState(initialSettings?.khmerNewYearStart || "");
    const [khmerNewYearEnd, setKhmerNewYearEnd] = useState(initialSettings?.khmerNewYearEnd || "");
    const [waterFestivalStart, setWaterFestivalStart] = useState(initialSettings?.waterFestivalStart || "");
    const [waterFestivalEnd, setWaterFestivalEnd] = useState(initialSettings?.waterFestivalEnd || "");

    const showingToday = resolveSeasonalEffect({
        seasonalEffect,
        khmerNewYearStart,
        khmerNewYearEnd,
        waterFestivalStart,
        waterFestivalEnd,
    });
    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setBanner(null);

        try {
            const token = await user.getIdToken();
            const res = await updateSettings(token, {
                portalName,
                logoUrl,
                seasonalEffect,
                khmerNewYearStart,
                khmerNewYearEnd,
                waterFestivalStart,
                waterFestivalEnd,
            });
            if (!res.success) throw new Error(res.message);
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
                <div className="space-y-4 rounded-xl border p-4">
                    <div className="space-y-1">
                        <h3 className="font-semibold">Seasonal effect</h3>
                        <p className="text-sm text-muted-foreground">
                            An animated layer behind the dashboard. Users can turn it off in their menu, and it never plays for people who have reduced motion turned on.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="seasonal-effect">Effect</Label>
                        <select
                            id="seasonal-effect"
                            className={SELECT_CLASS}
                            value={seasonalEffect}
                            onChange={e => setSeasonalEffect(e.target.value as SeasonalEffectSetting)}
                        >
                            {SEASONAL_EFFECT_SETTINGS.map(option => (
                                <option key={option} value={option}>{SEASONAL_EFFECT_LABELS[option]}</option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Showing today: <span className="font-medium text-foreground">{showingToday ? SEASONAL_EFFECT_LABELS[showingToday] : "Nothing"}</span>
                        </p>
                    </div>
                    {seasonalEffect === "auto" && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Auto shows fireworks on 1–3 January and snow all of December. Khmer New Year (petals) and Water Festival (lanterns) move each year, so set their dates here. Khmer New Year uses 13–16 April if left empty; Water Festival is skipped until set.
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="kny-start">Khmer New Year starts</Label>
                                    <Input id="kny-start" type="date" value={khmerNewYearStart} onChange={e => setKhmerNewYearStart(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="kny-end">Khmer New Year ends</Label>
                                    <Input id="kny-end" type="date" value={khmerNewYearEnd} min={khmerNewYearStart || undefined} onChange={e => setKhmerNewYearEnd(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wf-start">Water Festival starts</Label>
                                    <Input id="wf-start" type="date" value={waterFestivalStart} onChange={e => setWaterFestivalStart(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="wf-end">Water Festival ends</Label>
                                    <Input id="wf-end" type="date" value={waterFestivalEnd} min={waterFestivalStart || undefined} onChange={e => setWaterFestivalEnd(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                </Button>
            </form>
        </div>
    );
}
