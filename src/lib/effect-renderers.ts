// Canvas renderers for the seasonal background effects. Each renderer owns
// its particles and draws one frame at a time; sizes are in CSS pixels.
import { SeasonalEffect } from "@/lib/seasonal";

export interface EffectRenderer {
    resize(width: number, height: number, dpr: number): void;
    draw(time: number, dark: boolean): void;
}

type Ctx = CanvasRenderingContext2D;

// Particle counts are tuned for a ~390x844 phone screen and scaled by area.
const PHONE_AREA = 390 * 844;
const TAU = Math.PI * 2;

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

function scaledCount(base: number, w: number, h: number) {
    return Math.round(base * Math.min(Math.max((w * h) / PHONE_AREA, 0.6), 2.5));
}

function fillTo<T>(items: T[], count: number, make: () => T) {
    while (items.length < count) items.push(make());
    if (items.length > count) items.length = count;
}

function offscreen(w: number, h: number, dpr: number) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    const g = canvas.getContext("2d")!;
    g.scale(dpr, dpr);
    return { canvas, g };
}

// ---------------------------------------------------------------- shared shapes

function drawLantern(ctx: Ctx, x: number, y: number, size: number, glow: number) {
    const halo = ctx.createRadialGradient(x, y, 0, x, y, size * 2.6);
    halo.addColorStop(0, `rgba(255,190,90,${0.45 * glow})`);
    halo.addColorStop(1, "rgba(255,160,60,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.6, 0, TAU);
    ctx.fill();

    const bw = size * 0.9;
    const bh = size * 1.25;
    const body = ctx.createLinearGradient(x, y - bh / 2, x, y + bh / 2);
    body.addColorStop(0, "#ffd27a");
    body.addColorStop(1, "#f07c2b");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.55, y - bh / 2);
    ctx.lineTo(x + bw * 0.55, y - bh / 2);
    ctx.quadraticCurveTo(x + bw * 0.75, y, x + bw * 0.45, y + bh / 2);
    ctx.lineTo(x - bw * 0.45, y + bh / 2);
    ctx.quadraticCurveTo(x - bw * 0.75, y, x - bw * 0.55, y - bh / 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,245,210,${0.8 * glow})`;
    ctx.beginPath();
    ctx.ellipse(x, y + bh * 0.28, bw * 0.28, bh * 0.12, 0, 0, TAU);
    ctx.fill();
}

/** Lotus petal pointing up in local coordinates, pink tip fading to white. */
function lotusPetalPath(ctx: Ctx, s: number) {
    ctx.beginPath();
    ctx.moveTo(0, -s * 1.3);
    ctx.bezierCurveTo(s * 0.9, -s * 0.6, s * 0.75, s * 0.9, 0, s);
    ctx.bezierCurveTo(-s * 0.75, s * 0.9, -s * 0.9, -s * 0.6, 0, -s * 1.3);
}

function fillLotusPetal(ctx: Ctx, s: number) {
    lotusPetalPath(ctx, s);
    const g = ctx.createLinearGradient(0, -s * 1.3, 0, s);
    g.addColorStop(0, "#ec4899");
    g.addColorStop(0.55, "#f9a8d4");
    g.addColorStop(1, "#fff1f7");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(212,164,55,0.75)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
}

// ---------------------------------------------------------------- snow

function snow(ctx: Ctx): EffectRenderer {
    type Flake = { x: number; y: number; r: number; vy: number; sway: number; phase: number; a: number };
    let w = 0;
    let h = 0;
    const flakes: Flake[] = [];
    const spawn = (initial: boolean): Flake => {
        const depth = Math.random();
        return {
            x: rand(-10, w),
            y: initial ? rand(0, h) : rand(-20, -4),
            r: 1.3 + depth * 2.8,
            vy: 0.25 + depth * 0.9,
            sway: rand(0.2, 0.7),
            phase: rand(0, TAU),
            a: 0.5 + depth * 0.5,
        };
    };
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            fillTo(flakes, scaledCount(70, w, h), () => spawn(true));
        },
        draw(t, dark) {
            for (const f of flakes) {
                f.y += f.vy;
                f.x += Math.sin(t * 0.0008 + f.phase) * f.sway * 0.5 + 0.12;
                if (f.y > h + 6 || f.x > w + 6) Object.assign(f, spawn(false));
                if (!dark) {
                    // Soft blue halo so white flakes still read on a pale sky.
                    ctx.beginPath();
                    ctx.arc(f.x, f.y, f.r + 1.4, 0, TAU);
                    ctx.fillStyle = `rgba(90,140,200,${f.a * 0.28})`;
                    ctx.fill();
                }
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r, 0, TAU);
                ctx.fillStyle = `rgba(255,255,255,${f.a})`;
                ctx.fill();
            }
        },
    };
}

// ---------------------------------------------------------------- lanterns

type Lantern = { x: number; y: number; size: number; vy: number; phase: number; flicker: number };

function spawnLantern(w: number, fromY: number, initialH?: number): Lantern {
    return {
        x: rand(10, w - 10),
        y: initialH !== undefined ? rand(0, initialH) : fromY + rand(10, 60),
        size: rand(7, 14),
        vy: rand(0.25, 0.55),
        phase: rand(0, TAU),
        flicker: rand(0, TAU),
    };
}

function drawLanterns(ctx: Ctx, lanterns: Lantern[], t: number, w: number, fromY: number) {
    for (const l of lanterns) {
        l.y -= l.vy;
        if (l.y < -30) Object.assign(l, spawnLantern(w, fromY));
        const x = l.x + Math.sin(t * 0.0006 + l.phase) * 6;
        drawLantern(ctx, x, l.y, l.size, 0.75 + Math.sin(t * 0.006 + l.flicker) * 0.12);
    }
}

function lanterns(ctx: Ctx): EffectRenderer {
    let w = 0;
    let h = 0;
    const items: Lantern[] = [];
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            fillTo(items, scaledCount(14, w, h), () => spawnLantern(w, h, h));
        },
        draw(t) {
            drawLanterns(ctx, items, t, w, h);
        },
    };
}

// ---------------------------------------------------------------- petals & lotus

type Petal = {
    x: number; y: number; s: number; vy: number; vx: number;
    rot: number; vr: number; flip: number; vf: number; color: string; blossom: boolean;
};

const PETAL_COLORS = ["#f9a8d4", "#fbcfe8", "#fff1f7", "#f472b6"];

function spawnPetal(w: number, h: number, initial: boolean, blossom = false): Petal {
    return {
        x: rand(0, w),
        y: initial ? rand(0, h) : rand(-40, -8),
        s: blossom ? rand(9, 13) : rand(4, 7.5),
        vy: blossom ? rand(0.3, 0.5) : rand(0.5, 1.1),
        vx: rand(-0.2, 0.4),
        rot: rand(0, TAU),
        vr: blossom ? rand(-0.008, 0.008) : rand(-0.04, 0.04),
        flip: rand(0, TAU),
        vf: rand(0.03, 0.07),
        color: pick(PETAL_COLORS),
        blossom,
    };
}

function movePetal(p: Petal, w: number, h: number) {
    p.y += p.vy;
    p.x += p.vx + Math.sin(p.flip) * (p.blossom ? 0.25 : 0.4);
    p.rot += p.vr;
    p.flip += p.vf;
    if (p.y > h + 20) Object.assign(p, spawnPetal(w, h, false, p.blossom));
}

function petals(ctx: Ctx): EffectRenderer {
    let w = 0;
    let h = 0;
    const items: Petal[] = [];
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            fillTo(items, scaledCount(32, w, h), () => spawnPetal(w, h, true));
        },
        draw() {
            for (const p of items) {
                movePetal(p, w, h);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.scale(Math.cos(p.flip), 1);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(0, -p.s);
                ctx.bezierCurveTo(p.s * 0.9, -p.s * 0.6, p.s * 0.7, p.s * 0.7, 0, p.s);
                ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.7, -p.s * 0.9, -p.s * 0.6, 0, -p.s);
                ctx.fill();
                ctx.restore();
            }
        },
    };
}

/** Lotus petals with gold edges, plus a few whole blossoms drifting down slowly. */
function lotus(ctx: Ctx): EffectRenderer {
    let w = 0;
    let h = 0;
    const items: Petal[] = [];
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            const blossoms = scaledCount(3, w, h);
            const petalsCount = scaledCount(24, w, h);
            items.length = 0;
            for (let i = 0; i < blossoms; i++) items.push(spawnPetal(w, h, true, true));
            for (let i = 0; i < petalsCount; i++) items.push(spawnPetal(w, h, true));
        },
        draw() {
            for (const p of items) {
                movePetal(p, w, h);
                ctx.save();
                ctx.translate(p.x, p.y);
                if (p.blossom) {
                    ctx.rotate(Math.sin(p.rot) * 0.3);
                    // Back petals, then front petals, then the golden seed pod.
                    for (const angle of [-1.1, 1.1, -0.55, 0.55, 0]) {
                        ctx.save();
                        ctx.rotate(angle);
                        ctx.translate(0, -p.s * 0.35);
                        fillLotusPetal(ctx, p.s * (angle === 0 ? 0.95 : 0.8));
                        ctx.restore();
                    }
                    ctx.fillStyle = "#f5c451";
                    ctx.beginPath();
                    ctx.ellipse(0, p.s * 0.35, p.s * 0.35, p.s * 0.18, 0, 0, TAU);
                    ctx.fill();
                } else {
                    ctx.rotate(p.rot);
                    ctx.scale(Math.cos(p.flip), 1);
                    fillLotusPetal(ctx, p.s);
                }
                ctx.restore();
            }
        },
    };
}

// ---------------------------------------------------------------- fireworks

const FIREWORK_COLORS = ["#ff6b8b", "#ffd166", "#6ee7b7", "#7dd3fc", "#c4b5fd", "#fb923c"];

function fireworks(ctx: Ctx): EffectRenderer {
    type Spark = { x: number; y: number; vx: number; vy: number; life: number; color: string };
    type Rocket = { x: number; y: number; targetY: number; color: string };
    let w = 0;
    let h = 0;
    let sparks: Spark[] = [];
    let rockets: Rocket[] = [];
    let lastLaunch = 0;
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
        },
        draw(t) {
            if (t - lastLaunch > 1400) {
                lastLaunch = t;
                rockets.push({ x: rand(w * 0.15, w * 0.85), y: h * 0.72, targetY: rand(h * 0.08, h * 0.3), color: pick(FIREWORK_COLORS) });
            }
            rockets = rockets.filter((r) => {
                r.y -= 5;
                ctx.globalAlpha = 0.8;
                ctx.fillStyle = r.color;
                ctx.fillRect(r.x - 1, r.y, 2, 7);
                ctx.globalAlpha = 1;
                if (r.y > r.targetY) return true;
                for (let k = 0; k < 34; k++) {
                    const angle = (k / 34) * TAU;
                    const speed = rand(1.2, 2.6);
                    sparks.push({ x: r.x, y: r.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color: r.color });
                }
                return false;
            });
            sparks = sparks.filter((s) => {
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.035;
                s.vx *= 0.985;
                s.vy *= 0.985;
                s.life -= 0.013;
                if (s.life <= 0) return false;
                ctx.globalAlpha = s.life;
                ctx.fillStyle = s.color;
                ctx.beginPath();
                ctx.arc(s.x, s.y, 1.6, 0, TAU);
                ctx.fill();
                return true;
            });
            ctx.globalAlpha = 1;
        },
    };
}

// ---------------------------------------------------------------- fireflies

function fireflies(ctx: Ctx): EffectRenderer {
    type Fly = { x: number; y: number; vx: number; vy: number; phase: number; r: number };
    let w = 0;
    let h = 0;
    const flies: Fly[] = [];
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            fillTo(flies, scaledCount(20, w, h), () => ({
                x: rand(0, w), y: rand(h * 0.1, h * 0.95), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), phase: rand(0, TAU), r: rand(1.4, 2.4),
            }));
        },
        draw(t, dark) {
            for (const f of flies) {
                f.vx = Math.max(-0.4, Math.min(0.4, f.vx + rand(-0.03, 0.03)));
                f.vy = Math.max(-0.4, Math.min(0.4, f.vy + rand(-0.03, 0.03)));
                f.x += f.vx;
                f.y += f.vy;
                if (f.x < 0 || f.x > w) f.vx *= -1;
                if (f.y < 0 || f.y > h) f.vy *= -1;
                const a = 0.35 + 0.65 * Math.max(0, Math.sin(t * 0.0022 + f.phase));
                const glow = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * 6);
                glow.addColorStop(0, dark ? `rgba(220,255,140,${a})` : `rgba(160,190,40,${a})`);
                glow.addColorStop(1, "rgba(200,255,120,0)");
                ctx.fillStyle = glow;
                ctx.beginPath();
                ctx.arc(f.x, f.y, f.r * 6, 0, TAU);
                ctx.fill();
            }
        },
    };
}

// ---------------------------------------------------------------- kbach border

/**
 * Gold band of kbach (Khmer ornament) flame-leaves along the top edge, with a
 * slow shimmer and a few gold glints drifting down from it.
 */
function kbach(ctx: Ctx): EffectRenderer {
    const BAND = 34;
    const UNIT = 30;
    type Glint = { x: number; y: number; vy: number; life: number; phase: number };
    let w = 0;
    let h = 0;
    let dpr = 1;
    let band: HTMLCanvasElement | null = null;
    let bandDark: boolean | null = null;
    const glints: Glint[] = [];

    const leaf = (g: Ctx, cx: number, top: number, s: number) => {
        // A hanging flame-leaf whose tip curls to the right.
        g.beginPath();
        g.moveTo(cx - 9 * s, top);
        g.quadraticCurveTo(cx - 9 * s, top + 10 * s, cx - 2 * s, top + 15 * s);
        g.quadraticCurveTo(cx + 1 * s, top + 18 * s, cx + 4 * s, top + 16 * s);
        g.quadraticCurveTo(cx + 6 * s, top + 14 * s, cx + 3 * s, top + 13 * s);
        g.quadraticCurveTo(cx + 9 * s, top + 8 * s, cx + 9 * s, top);
        g.closePath();
        g.fill();
    };

    const renderBand = (dark: boolean) => {
        const { canvas, g } = offscreen(w, BAND, dpr);
        const gold = g.createLinearGradient(0, 0, 0, BAND);
        gold.addColorStop(0, dark ? "#f5d27a" : "#f7d98b");
        gold.addColorStop(1, dark ? "#b07f2a" : "#c8963a");
        g.fillStyle = gold;
        g.fillRect(0, 2, w, 2.2);
        g.fillRect(0, 6, w, 0.9);
        const units = Math.ceil(w / UNIT) + 1;
        for (let i = 0; i < units; i++) {
            const cx = i * UNIT + UNIT / 2;
            leaf(g, cx, 8, 1);
            g.beginPath();
            g.arc(i * UNIT, 11, 1.7, 0, TAU);
            g.fill();
        }
        // Hollow out each leaf so it reads as carved ornament, not a blob.
        g.globalCompositeOperation = "destination-out";
        for (let i = 0; i < units; i++) leaf(g, i * UNIT + UNIT / 2, 10.5, 0.45);
        g.globalCompositeOperation = "source-over";
        return canvas;
    };

    const spawnGlint = (initial: boolean): Glint => ({
        x: rand(0, w), y: initial ? rand(BAND, 160) : rand(18, BAND), vy: rand(0.15, 0.35), life: 1, phase: rand(0, TAU),
    });

    return {
        resize(nw, nh, ndpr) {
            w = nw;
            h = nh;
            dpr = ndpr;
            band = null;
            fillTo(glints, Math.round(scaledCount(12, w, h * 0.6)), () => spawnGlint(true));
        },
        draw(t, dark) {
            if (!band || bandDark !== dark) {
                band = renderBand(dark);
                bandDark = dark;
            }
            ctx.globalAlpha = 0.9;
            ctx.drawImage(band, 0, 0, w, BAND);
            ctx.globalAlpha = 1;

            // Shimmer sweeping across the gold, only where the band is drawn.
            const pos = (((t * 0.00012) % 1.4) - 0.2) * w;
            const shine = ctx.createLinearGradient(pos - 90, 0, pos + 90, 0);
            shine.addColorStop(0, "rgba(255,255,255,0)");
            shine.addColorStop(0.5, "rgba(255,250,225,0.75)");
            shine.addColorStop(1, "rgba(255,255,255,0)");
            ctx.globalCompositeOperation = "source-atop";
            ctx.fillStyle = shine;
            ctx.fillRect(0, 0, w, BAND);
            ctx.globalCompositeOperation = "source-over";

            for (const g of glints) {
                g.y += g.vy;
                g.life = 1 - Math.max(0, (g.y - BAND) / 140);
                if (g.life <= 0) Object.assign(g, spawnGlint(false));
                const a = Math.max(0, g.life) * (0.5 + 0.5 * Math.sin(t * 0.004 + g.phase));
                const s = 2.4;
                ctx.strokeStyle = dark ? `rgba(245,210,122,${a})` : `rgba(190,140,40,${a})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(g.x - s, g.y);
                ctx.lineTo(g.x + s, g.y);
                ctx.moveTo(g.x, g.y - s);
                ctx.lineTo(g.x, g.y + s);
                ctx.stroke();
            }
        },
    };
}

// ---------------------------------------------------------------- Angkor Wat

/** Angkor Wat and sugar palms at the bottom, a sunrise glow, and birds crossing. */
function angkor(ctx: Ctx): EffectRenderer {
    type Bird = { x: number; y: number; speed: number; phase: number; size: number };
    let w = 0;
    let h = 0;
    let dpr = 1;
    let scene: HTMLCanvasElement | null = null;
    let sceneDark: boolean | null = null;
    const birds: Bird[] = [];

    const sizes = () => {
        const templeW = Math.min(w * 0.9, 560);
        const sceneH = Math.min(h * 0.2, 170, templeW * 0.38);
        return { templeW, sceneH };
    };

    const tower = (g: Ctx, cx: number, bottom: number, tw: number, th: number) => {
        g.beginPath();
        g.moveTo(cx - tw / 2, bottom);
        g.lineTo(cx - tw / 2, bottom - th * 0.18);
        g.lineTo(cx - tw * 0.42, bottom - th * 0.18);
        g.lineTo(cx - tw * 0.42, bottom - th * 0.32);
        // Lotus-bud spire
        g.bezierCurveTo(cx - tw * 0.5, bottom - th * 0.6, cx - tw * 0.22, bottom - th * 0.9, cx, bottom - th);
        g.bezierCurveTo(cx + tw * 0.22, bottom - th * 0.9, cx + tw * 0.5, bottom - th * 0.6, cx + tw * 0.42, bottom - th * 0.32);
        g.lineTo(cx + tw * 0.42, bottom - th * 0.18);
        g.lineTo(cx + tw / 2, bottom - th * 0.18);
        g.lineTo(cx + tw / 2, bottom);
        g.closePath();
        g.fill();
        g.fillRect(cx - 0.8, bottom - th * 1.08, 1.6, th * 0.08);
        // Carved tiers on the spire
        g.globalCompositeOperation = "destination-out";
        for (let k = 1; k <= 4; k++) {
            const y = bottom - th * (0.36 + k * 0.11);
            const tierW = tw * 0.8 * (1 - k * 0.17);
            g.fillRect(cx - tierW / 2, y, tierW, 1);
        }
        g.globalCompositeOperation = "source-over";
    };

    const palm = (g: Ctx, x: number, bottom: number, ph: number) => {
        const topX = x + ph * 0.04;
        const topY = bottom - ph;
        g.lineWidth = 2.2;
        g.lineCap = "round";
        g.beginPath();
        g.moveTo(x, bottom);
        g.quadraticCurveTo(x - ph * 0.02, bottom - ph * 0.5, topX, topY);
        g.stroke();
        // Sugar-palm crown: a round fan of fronds
        g.lineWidth = 1.4;
        for (let i = 0; i < 11; i++) {
            const angle = Math.PI + (i / 10) * Math.PI;
            const len = ph * 0.2;
            const ex = topX + Math.cos(angle) * len;
            const ey = topY + Math.sin(angle) * len * 0.85 + len * 0.25;
            g.beginPath();
            g.moveTo(topX, topY);
            g.quadraticCurveTo((topX + ex) / 2, (topY + ey) / 2 - len * 0.2, ex, ey);
            g.stroke();
        }
        g.beginPath();
        g.arc(topX, topY + 1, 3.2, 0, TAU);
        g.fill();
    };

    const renderScene = (dark: boolean) => {
        const { templeW, sceneH } = sizes();
        const cx = w / 2;
        const base = h;
        const { canvas, g } = offscreen(w, h, dpr);

        const glowY = base - sceneH * 0.5;
        const glow = g.createRadialGradient(cx, glowY, 0, cx, glowY, Math.max(w * 0.8, sceneH * 4));
        glow.addColorStop(0, dark ? "rgba(255,150,70,0.30)" : "rgba(255,176,96,0.40)");
        glow.addColorStop(0.35, dark ? "rgba(255,110,60,0.10)" : "rgba(255,150,110,0.14)");
        glow.addColorStop(1, "rgba(255,140,90,0)");
        g.fillStyle = glow;
        g.fillRect(0, 0, w, h);

        g.fillStyle = dark ? "rgba(255,190,110,0.55)" : "rgba(255,196,120,0.75)";
        g.beginPath();
        g.arc(cx, base - sceneH * 0.8, Math.min(w * 0.09, 56), 0, TAU);
        g.fill();

        // Silhouette on its own layer so overlapping shapes share one opacity.
        const sil = offscreen(w, h, dpr);
        const s = sil.g;
        const color = dark ? "#060a14" : "#7a4230";
        s.fillStyle = color;
        s.strokeStyle = color;
        s.fillRect(0, base - sceneH * 0.1, w, sceneH * 0.1 + 1);
        const terraces: [number, number][] = [[1, 0.22], [0.78, 0.38], [0.56, 0.52]];
        for (const [widthRatio, heightRatio] of terraces) {
            const tw = templeW * widthRatio;
            s.fillRect(cx - tw / 2, base - sceneH * heightRatio, tw, sceneH * heightRatio);
        }
        tower(s, cx - templeW * 0.33, base - sceneH * 0.22, templeW * 0.09, sceneH * 0.36);
        tower(s, cx + templeW * 0.33, base - sceneH * 0.22, templeW * 0.09, sceneH * 0.36);
        tower(s, cx - templeW * 0.16, base - sceneH * 0.38, templeW * 0.1, sceneH * 0.42);
        tower(s, cx + templeW * 0.16, base - sceneH * 0.38, templeW * 0.1, sceneH * 0.42);
        tower(s, cx, base - sceneH * 0.52, templeW * 0.13, sceneH * 0.48);
        palm(s, cx - templeW * 0.56, base - sceneH * 0.08, sceneH * 0.95);
        palm(s, cx - templeW * 0.66, base - sceneH * 0.08, sceneH * 0.7);
        palm(s, cx + templeW * 0.6, base - sceneH * 0.08, sceneH * 0.85);

        g.globalAlpha = dark ? 0.92 : 0.42;
        g.drawImage(sil.canvas, 0, 0, w, h);
        g.globalAlpha = 1;
        return canvas;
    };

    const spawnBird = (initial: boolean): Bird => {
        const { sceneH } = sizes();
        return {
            x: initial ? rand(0, w) : rand(-120, -20),
            y: rand(h - sceneH * 2.2, h - sceneH * 1.1),
            speed: rand(0.35, 0.7),
            phase: rand(0, TAU),
            size: rand(4, 7),
        };
    };

    return {
        resize(nw, nh, ndpr) {
            w = nw;
            h = nh;
            dpr = ndpr;
            scene = null;
            birds.length = 0;
            for (let i = 0; i < 5; i++) birds.push(spawnBird(true));
        },
        draw(t, dark) {
            if (!scene || sceneDark !== dark) {
                scene = renderScene(dark);
                sceneDark = dark;
            }
            ctx.drawImage(scene, 0, 0, w, h);
            ctx.strokeStyle = dark ? "rgba(255,210,160,0.6)" : "rgba(70,40,35,0.55)";
            ctx.lineWidth = 1.3;
            ctx.lineCap = "round";
            for (const b of birds) {
                b.x += b.speed;
                if (b.x > w + 20) Object.assign(b, spawnBird(false));
                const wing = Math.sin(t * 0.009 + b.phase) * b.size * 0.6;
                ctx.beginPath();
                ctx.moveTo(b.x - b.size, b.y - wing);
                ctx.quadraticCurveTo(b.x - b.size * 0.4, b.y - wing * 0.2 - 1, b.x, b.y);
                ctx.quadraticCurveTo(b.x + b.size * 0.4, b.y - wing * 0.2 - 1, b.x + b.size, b.y - wing);
                ctx.stroke();
            }
        },
    };
}

// ---------------------------------------------------------------- Water Festival boats

/** Bon Om Touk: long racing boats rowing in unison across the water, lanterns rising. */
function boats(ctx: Ctx): EffectRenderer {
    type Boat = { x: number; speed: number; len: number; color: string; lane: number };
    const BOAT_COLORS = ["#dc2626", "#16a34a", "#d97706"];
    let w = 0;
    let h = 0;
    const fleet: Boat[] = [];
    const lanternList: Lantern[] = [];

    const waterTop = () => h - Math.min(h * 0.16, 130);
    const spawnBoat = (lane: number, initial: boolean): Boat => {
        const len = Math.min(Math.max(w * 0.55, 180), 420);
        return {
            x: initial ? rand(-len * 0.5, w - len * 0.5) : rand(-len - 240, -len - 40),
            speed: rand(0.5, 0.9),
            len,
            color: BOAT_COLORS[lane % BOAT_COLORS.length],
            lane,
        };
    };

    const drawBoat = (b: Boat, y: number, t: number, dark: boolean) => {
        const { x, len } = b;
        ctx.lineCap = "round";
        const hull = () => {
            ctx.beginPath();
            ctx.moveTo(x, y - 7);
            ctx.quadraticCurveTo(x + len * 0.08, y + 3, x + len * 0.3, y + 3);
            ctx.lineTo(x + len * 0.8, y + 3);
            ctx.quadraticCurveTo(x + len * 0.95, y + 2, x + len, y - 9);
        };
        hull();
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.save();
        ctx.translate(0, -1.8);
        hull();
        ctx.strokeStyle = "#f2c14e";
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();

        // Naga-head prow
        ctx.fillStyle = "#f2c14e";
        ctx.beginPath();
        ctx.arc(x + len, y - 10, 3, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + len - 1, y - 12);
        ctx.lineTo(x + len + 2, y - 18);
        ctx.lineTo(x + len + 3, y - 11);
        ctx.fill();

        // Rowers pull together
        const rowers = Math.max(8, Math.round(len / 14));
        const stroke = Math.sin(t * 0.012 + b.lane);
        const figure = dark ? "rgba(241,220,192,0.9)" : "rgba(59,42,34,0.85)";
        ctx.strokeStyle = figure;
        ctx.fillStyle = figure;
        ctx.lineWidth = 1.3;
        for (let i = 0; i < rowers; i++) {
            const px = x + len * (0.14 + (0.72 * i) / (rowers - 1));
            ctx.beginPath();
            ctx.arc(px, y - 8, 2, 0, TAU);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(px, y - 6);
            ctx.lineTo(px, y - 1);
            ctx.moveTo(px, y - 4);
            ctx.lineTo(px - 4 - stroke * 5, y + 7);
            ctx.stroke();
        }
    };

    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
            fleet.length = 0;
            const lanes = w > 700 ? 3 : 2;
            for (let lane = 0; lane < lanes; lane++) fleet.push(spawnBoat(lane, true));
            fillTo(lanternList, scaledCount(8, w, h), () => spawnLantern(w, waterTop(), waterTop()));
        },
        draw(t, dark) {
            const top = waterTop();
            drawLanterns(ctx, lanternList, t, w, top);

            const water = ctx.createLinearGradient(0, top, 0, h);
            water.addColorStop(0, dark ? "rgba(56,120,200,0.20)" : "rgba(56,140,210,0.18)");
            water.addColorStop(1, dark ? "rgba(30,80,160,0.38)" : "rgba(40,110,190,0.32)");
            ctx.fillStyle = water;
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let x = 0; x <= w + 10; x += 10) ctx.lineTo(x, top + Math.sin(x * 0.04 + t * 0.002) * 2.5);
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            for (const b of fleet) {
                b.x += b.speed;
                if (b.x > w + 30) Object.assign(b, spawnBoat(b.lane, false));
                drawBoat(b, top + 18 + b.lane * 24, t, dark);
            }
        },
    };
}

// ---------------------------------------------------------------- Khmer New Year splash

/** Choul Chnam Thmey: bursts of splashed water and soft clouds of festival powder. */
function splash(ctx: Ctx): EffectRenderer {
    type Drop = { x: number; y: number; vx: number; vy: number; life: number };
    type Puff = { x: number; y: number; r: number; maxR: number; life: number; color: string };
    const POWDER_LIGHT = ["244,114,182", "250,204,21", "74,222,128", "167,139,250"];
    const POWDER_DARK = ["255,255,255", "244,114,182", "250,204,21", "167,139,250"];
    let w = 0;
    let h = 0;
    let drops: Drop[] = [];
    let puffs: Puff[] = [];
    let lastBurst = 0;
    let waterNext = true;

    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
        },
        draw(t, dark) {
            if (t - lastBurst > 900) {
                lastBurst = t;
                const x = rand(w * 0.1, w * 0.9);
                const y = rand(h * 0.15, h * 0.7);
                if (waterNext) {
                    for (let i = 0; i < 24; i++) {
                        const angle = rand(-Math.PI * 0.95, -Math.PI * 0.05);
                        const speed = rand(2, 4.5);
                        drops.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 });
                    }
                } else {
                    const colors = dark ? POWDER_DARK : POWDER_LIGHT;
                    for (let i = 0; i < 4; i++) {
                        puffs.push({ x: x + rand(-30, 30), y: y + rand(-20, 20), r: 4, maxR: rand(30, 60), life: 1, color: pick(colors) });
                    }
                }
                waterNext = !waterNext;
            }

            puffs = puffs.filter((p) => {
                p.r += (p.maxR - p.r) * 0.04;
                p.life -= 0.008;
                if (p.life <= 0) return false;
                const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
                g.addColorStop(0, `rgba(${p.color},${0.45 * p.life})`);
                g.addColorStop(1, `rgba(${p.color},0)`);
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, TAU);
                ctx.fill();
                return true;
            });

            ctx.lineCap = "round";
            drops = drops.filter((d) => {
                d.x += d.vx;
                d.y += d.vy;
                d.vy += 0.12;
                d.life -= 0.012;
                if (d.life <= 0 || d.y > h + 10) return false;
                ctx.strokeStyle = dark ? `rgba(147,197,253,${d.life})` : `rgba(59,130,246,${d.life * 0.8})`;
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(d.x, d.y);
                ctx.lineTo(d.x - d.vx * 2, d.y - d.vy * 2);
                ctx.stroke();
                ctx.fillStyle = `rgba(255,255,255,${d.life * 0.8})`;
                ctx.beginPath();
                ctx.arc(d.x, d.y, 0.9, 0, TAU);
                ctx.fill();
                return true;
            });
        },
    };
}

// ---------------------------------------------------------------- naga

/** Seven-headed naga, like the temple balustrades, undulating above the bottom bar. */
function naga(ctx: Ctx): EffectRenderer {
    let w = 0;
    let h = 0;
    return {
        resize(nw, nh) {
            w = nw;
            h = nh;
        },
        draw(t, dark) {
            const baseY = h - 96;
            const headX = Math.min(64, w * 0.15);
            const yAt = (x: number) => baseY + Math.sin(x * 0.028 - t * 0.0012) * 5;
            const breath = 1 + Math.sin(t * 0.002) * 0.04;
            const hoodX = headX;
            const hoodY = baseY - 44;

            ctx.save();
            ctx.globalAlpha = dark ? 0.8 : 0.65;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            const body = () => {
                ctx.beginPath();
                ctx.moveTo(hoodX, hoodY);
                ctx.quadraticCurveTo(headX - 4, baseY - 6, headX + 26, yAt(headX + 26));
                for (let x = headX + 34; x <= w + 20; x += 8) ctx.lineTo(x, yAt(x));
            };
            const gold = ctx.createLinearGradient(0, hoodY, 0, baseY + 10);
            gold.addColorStop(0, "#f5d27a");
            gold.addColorStop(1, "#c8963a");

            body();
            ctx.strokeStyle = "#8a6420";
            ctx.lineWidth = 13;
            ctx.stroke();
            ctx.strokeStyle = gold;
            ctx.lineWidth = 10;
            ctx.stroke();
            ctx.setLineDash([3, 5]);
            ctx.strokeStyle = "rgba(120,80,20,0.55)";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.setLineDash([]);

            // Hood fan behind the seven heads
            const radius = 24 * breath;
            ctx.fillStyle = gold;
            ctx.strokeStyle = "#8a6420";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(hoodX, hoodY);
            ctx.arc(hoodX, hoodY, radius + 6, -Math.PI / 2 - 1.1, -Math.PI / 2 + 1.1);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            for (let k = -3; k <= 3; k++) {
                const angle = -Math.PI / 2 + k * 0.32;
                const hx = hoodX + Math.cos(angle) * radius;
                const hy = hoodY + Math.sin(angle) * radius;
                ctx.save();
                ctx.translate(hx, hy);
                ctx.rotate(angle + Math.PI / 2);
                // Flame crest
                ctx.fillStyle = "#f5d27a";
                ctx.beginPath();
                ctx.moveTo(-2.5, -3);
                ctx.quadraticCurveTo(0, -11, 2.5, -3);
                ctx.fill();
                // Head
                ctx.fillStyle = gold;
                ctx.beginPath();
                ctx.ellipse(0, 0, 3.4, 4.6, 0, 0, TAU);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = "#3b2508";
                ctx.beginPath();
                ctx.arc(-1.3, -0.6, 0.7, 0, TAU);
                ctx.arc(1.3, -0.6, 0.7, 0, TAU);
                ctx.fill();
                ctx.restore();
            }

            // Glints travelling along the body
            for (let i = 0; i < 3; i++) {
                const gx = headX + 40 + ((t * 0.04 + (i * w) / 3) % Math.max(1, w - headX - 40));
                const a = 0.5 + 0.5 * Math.sin(t * 0.005 + i);
                ctx.fillStyle = `rgba(255,250,220,${a})`;
                ctx.beginPath();
                ctx.arc(gx, yAt(gx) - 2, 1.6, 0, TAU);
                ctx.fill();
            }
            ctx.restore();
        },
    };
}

const FACTORIES: Record<SeasonalEffect, (ctx: Ctx) => EffectRenderer> = {
    snow,
    lanterns,
    petals,
    fireworks,
    fireflies,
    lotus,
    kbach,
    angkor,
    boats,
    splash,
    naga,
};

export function createEffectRenderer(effect: SeasonalEffect, ctx: Ctx): EffectRenderer {
    return FACTORIES[effect](ctx);
}
