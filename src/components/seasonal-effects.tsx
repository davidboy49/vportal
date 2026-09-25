"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SeasonalEffect } from "@/lib/seasonal";
import { createEffectRenderer } from "@/lib/effect-renderers";
import { cn } from "@/lib/utils";

const ENABLED_KEY = "vportal-seasonal-effects";
const ENABLED_EVENT = "vportal_seasonal_effects_updated";

function subscribeEnabled(callback: () => void) {
    window.addEventListener(ENABLED_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
        window.removeEventListener(ENABLED_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

function readEnabled() {
    try {
        return localStorage.getItem(ENABLED_KEY) !== "off";
    } catch {
        return true;
    }
}

/** Per-device on/off switch for seasonal effects (on by default). */
export function useSeasonalEffectsEnabled() {
    const enabled = useSyncExternalStore(subscribeEnabled, readEnabled, () => true);
    const setEnabled = (next: boolean) => {
        try {
            localStorage.setItem(ENABLED_KEY, next ? "on" : "off");
        } catch {
            // ignore
        }
        window.dispatchEvent(new Event(ENABLED_EVENT));
    };
    return [enabled, setEnabled] as const;
}

/**
 * Decorative full-screen canvas for the seasonal and Khmer-style effects.
 * Ignores pointer input, pauses while the tab is hidden, and renders nothing
 * for users who prefer reduced motion or switched effects off.
 */
export function SeasonalEffects({ effect, className }: { effect: SeasonalEffect | null; className?: string }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [enabled] = useSeasonalEffectsEnabled();
    const reducedMotion = useSyncExternalStore(
        (callback) => {
            const query = window.matchMedia("(prefers-reduced-motion: reduce)");
            query.addEventListener("change", callback);
            return () => query.removeEventListener("change", callback);
        },
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        () => true
    );
    const active = effect && enabled && !reducedMotion ? effect : null;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!active || !canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const renderer = createEffectRenderer(active, ctx);
        let w = 0;
        let h = 0;
        let frame = 0;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            renderer.resize(w, h, dpr);
        };

        const tick = (t: number) => {
            ctx.clearRect(0, 0, w, h);
            renderer.draw(t, document.documentElement.classList.contains("dark"));
            frame = requestAnimationFrame(tick);
        };

        const handleVisibility = () => {
            cancelAnimationFrame(frame);
            if (!document.hidden) frame = requestAnimationFrame(tick);
        };

        resize();
        frame = requestAnimationFrame(tick);
        window.addEventListener("resize", resize);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("resize", resize);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [active]);

    if (!active) return null;
    return <canvas ref={canvasRef} aria-hidden="true" className={cn("pointer-events-none fixed inset-0 z-0 h-full w-full", className)} />;
}
