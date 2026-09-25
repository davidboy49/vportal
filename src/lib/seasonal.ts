// Seasonal background effects: the admin picks "auto" (by date), a fixed
// effect, or "off" in Portal Settings. Pure helpers, safe on server and client.

export const SEASONAL_EFFECTS = ["snow", "lanterns", "petals", "fireworks", "fireflies"] as const;
export type SeasonalEffect = (typeof SEASONAL_EFFECTS)[number];

export const SEASONAL_EFFECT_SETTINGS = ["auto", "off", ...SEASONAL_EFFECTS] as const;
export type SeasonalEffectSetting = (typeof SEASONAL_EFFECT_SETTINGS)[number];

export const SEASONAL_EFFECT_LABELS: Record<SeasonalEffectSetting, string> = {
    auto: "Auto (by season)",
    off: "Off",
    snow: "Snowfall",
    lanterns: "Floating lanterns",
    petals: "Flower petals",
    fireworks: "Fireworks",
    fireflies: "Fireflies",
};

export interface SeasonalSettings {
    seasonalEffect?: SeasonalEffectSetting;
    // YYYY-MM-DD; both festivals follow the lunar calendar, so admins set them yearly.
    khmerNewYearStart?: string;
    khmerNewYearEnd?: string;
    waterFestivalStart?: string;
    waterFestivalEnd?: string;
}

function toDayKey(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function inRange(today: string, start?: string, end?: string) {
    if (!start) return false;
    return today >= start && today <= (end || start);
}

/** The effect to show right now, or null for none. Unset means "auto". */
export function resolveSeasonalEffect(settings: SeasonalSettings | undefined, now = new Date()): SeasonalEffect | null {
    const setting = settings?.seasonalEffect ?? "auto";
    if (setting === "off") return null;
    if (setting !== "auto") return setting;

    const today = toDayKey(now);
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    if (month === 1 && day <= 3) return "fireworks";

    // Khmer New Year usually falls on 13/14-16 April; admins can set the exact days.
    if (settings?.khmerNewYearStart) {
        if (inRange(today, settings.khmerNewYearStart, settings.khmerNewYearEnd)) return "petals";
    } else if (inRange(today, `${year}-04-13`, `${year}-04-16`)) {
        return "petals";
    }

    // Water Festival moves between October and November, so it only runs once set.
    if (inRange(today, settings?.waterFestivalStart, settings?.waterFestivalEnd)) return "lanterns";

    if (month === 12) return "snow";
    return null;
}
