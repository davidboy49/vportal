"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { SeasonalEffect } from "@/lib/seasonal";
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

type Particle = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    phase: number;
    alpha: number;
    rot: number;
    vr: number;
    flip: number;
    vf: number;
    life: number;
    color: string;
};

type Rocket = { x: number; y: number; targetY: number; color: string };

// Particle counts are tuned for a ~390x844 phone screen and scaled by area.
const BASE_COUNT: Record<Exclude<SeasonalEffect, "fireworks">, number> = {
    snow: 70,
    lanterns: 14,
    petals: 32,
    fireflies: 20,
};
const PHONE_AREA = 390 * 844;
const PETAL_COLORS = ["#f9a8d4", "#fbcfe8", "#fff1f7", "#f472b6"];
const FIREWORK_COLORS = ["#ff6b8b", "#ffd166", "#6ee7b7", "#7dd3fc", "#c4b5fd", "#fb923c"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function blank(): Particle {
    return { x: 0, y: 0, vx: 0, vy: 0, size: 0, phase: 0, alpha: 1, rot: 0, vr: 0, flip: 0, vf: 0, life: 1, color: "" };
}

function spawn(effect: SeasonalEffect, w: number, h: number, initial: boolean): Particle {
    const p = blank();
    switch (effect) {
        case "snow": {
            const depth = Math.random();
            p.x = rand(0, w);
            p.y = initial ? rand(0, h) : rand(-20, -4);
            p.size = 1.3 + depth * 2.8;
            p.vy = 0.25 + depth * 0.9;
            p.phase = rand(0, Math.PI * 2);
            p.vx = rand(0.2, 0.7);
            p.alpha = 0.5 + depth * 0.5;
            break;
        }
        case "lanterns":
            p.x = rand(10, w - 10);
            p.y = initial ? rand(0, h) : h + rand(10, 60);
            p.size = rand(7, 14);
            p.vy = rand(0.25, 0.55);
            p.phase = rand(0, Math.PI * 2);
            p.flip = rand(0, Math.PI * 2);
            break;
        case "petals":
            p.x = rand(0, w);
            p.y = initial ? rand(0, h) : rand(-30, -6);
            p.size = rand(4, 7.5);
            p.vy = rand(0.5, 1.1);
            p.vx = rand(-0.2, 0.4);
            p.rot = rand(0, Math.PI * 2);
            p.vr = rand(-0.04, 0.04);
            p.flip = rand(0, Math.PI * 2);
            p.vf = rand(0.03, 0.07);
            p.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
            break;
        case "fireflies":
            p.x = rand(0, w);
            p.y = rand(h * 0.1, h * 0.95);
            p.vx = rand(-0.3, 0.3);
            p.vy = rand(-0.3, 0.3);
            p.phase = rand(0, Math.PI * 2);
            p.size = rand(1.4, 2.4);
            break;
        case "fireworks":
            break;
    }
    return p;
}

/**
 * Decorative full-screen canvas (snow, lanterns, petals, fireworks, fireflies).
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

        let w = 0;
        let h = 0;
        let particles: Particle[] = [];
        let rockets: Rocket[] = [];
        let lastLaunch = 0;
        let frame = 0;

        const targetCount = () => {
            if (active === "fireworks") return 0;
            const scale = Math.min(Math.max((w * h) / PHONE_AREA, 0.6), 2.5);
            return Math.round(BASE_COUNT[active] * scale);
        };

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = targetCount();
            while (particles.length < count) particles.push(spawn(active, w, h, true));
            if (active !== "fireworks" && particles.length > count) particles.length = count;
        };

        const isDark = () => document.documentElement.classList.contains("dark");

        const drawSnow = (t: number, dark: boolean) => {
            for (const p of particles) {
                p.y += p.vy;
                p.x += Math.sin(t * 0.0008 + p.phase) * p.vx * 0.5 + 0.12;
                if (p.y > h + 6 || p.x > w + 6) {
                    Object.assign(p, spawn("snow", w, h, false));
                    p.x = rand(-10, w);
                }
                if (!dark) {
                    // Soft blue halo so white flakes still read on a pale sky.
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size + 1.4, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(90,140,200,${p.alpha * 0.28})`;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${p.alpha})`;
                ctx.fill();
            }
        };

        const drawLanterns = (t: number) => {
            for (const p of particles) {
                p.y -= p.vy;
                if (p.y < -30) Object.assign(p, spawn("lanterns", w, h, false));
                const x = p.x + Math.sin(t * 0.0006 + p.phase) * 6;
                const glow = 0.75 + Math.sin(t * 0.006 + p.flip) * 0.12;
                const halo = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.size * 2.6);
                halo.addColorStop(0, `rgba(255,190,90,${0.45 * glow})`);
                halo.addColorStop(1, "rgba(255,160,60,0)");
                ctx.fillStyle = halo;
                ctx.beginPath();
                ctx.arc(x, p.y, p.size * 2.6, 0, Math.PI * 2);
                ctx.fill();

                const bw = p.size * 0.9;
                const bh = p.size * 1.25;
                const body = ctx.createLinearGradient(x, p.y - bh / 2, x, p.y + bh / 2);
                body.addColorStop(0, "#ffd27a");
                body.addColorStop(1, "#f07c2b");
                ctx.fillStyle = body;
                ctx.beginPath();
                ctx.moveTo(x - bw * 0.55, p.y - bh / 2);
                ctx.lineTo(x + bw * 0.55, p.y - bh / 2);
                ctx.quadraticCurveTo(x + bw * 0.75, p.y, x + bw * 0.45, p.y + bh / 2);
                ctx.lineTo(x - bw * 0.45, p.y + bh / 2);
                ctx.quadraticCurveTo(x - bw * 0.75, p.y, x - bw * 0.55, p.y - bh / 2);
                ctx.fill();
                ctx.fillStyle = `rgba(255,245,210,${0.8 * glow})`;
                ctx.beginPath();
                ctx.ellipse(x, p.y + bh * 0.28, bw * 0.28, bh * 0.12, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const drawPetals = () => {
            for (const p of particles) {
                p.y += p.vy;
                p.x += p.vx + Math.sin(p.flip) * 0.4;
                p.rot += p.vr;
                p.flip += p.vf;
                if (p.y > h + 10) Object.assign(p, spawn("petals", w, h, false));
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(Math.cos(p.flip), 1);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(0, -p.size);
                ctx.bezierCurveTo(p.size * 0.9, -p.size * 0.6, p.size * 0.7, p.size * 0.7, 0, p.size);
                ctx.bezierCurveTo(-p.size * 0.7, p.size * 0.7, -p.size * 0.9, -p.size * 0.6, 0, -p.size);
                ctx.fill();
                ctx.restore();
            }
        };

        const drawFireworks = (t: number) => {
            if (t - lastLaunch > 1400) {
                lastLaunch = t;
                rockets.push({
                    x: rand(w * 0.15, w * 0.85),
                    y: h * 0.72,
                    targetY: rand(h * 0.08, h * 0.3),
                    color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
                });
            }
            rockets = rockets.filter((r) => {
                r.y -= 5;
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = r.color;
                ctx.fillRect(r.x - 1, r.y, 2, 7);
                ctx.globalAlpha = 1;
                if (r.y > r.targetY) return true;
                for (let k = 0; k < 34; k++) {
                    const angle = (k / 34) * Math.PI * 2;
                    const speed = rand(1.2, 2.6);
                    const p = blank();
                    p.x = r.x;
                    p.y = r.y;
                    p.vx = Math.cos(angle) * speed;
                    p.vy = Math.sin(angle) * speed;
                    p.color = r.color;
                    particles.push(p);
                }
                return false;
            });
            particles = particles.filter((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.035;
                p.vx *= 0.985;
                p.vy *= 0.985;
                p.life -= 0.013;
                if (p.life <= 0) return false;
                ctx.globalAlpha = p.life;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
                ctx.fill();
                return true;
            });
            ctx.globalAlpha = 1;
        };

        const drawFireflies = (t: number, dark: boolean) => {
            for (const p of particles) {
                p.vx = Math.max(-0.4, Math.min(0.4, p.vx + rand(-0.03, 0.03)));
                p.vy = Math.max(-0.4, Math.min(0.4, p.vy + rand(-0.03, 0.03)));
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.0022 + p.phase));
                const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 6);
                glow.addColorStop(0, dark ? `rgba(220,255,140,${a})` : `rgba(160,190,40,${a})`);
                glow.addColorStop(1, "rgba(200,255,120,0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 6, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const tick = (t: number) => {
            ctx.clearRect(0, 0, w, h);
            const dark = isDark();
            if (active === "snow") drawSnow(t, dark);
            else if (active === "lanterns") drawLanterns(t);
            else if (active === "petals") drawPetals();
            else if (active === "fireworks") drawFireworks(t);
            else drawFireflies(t, dark);
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
