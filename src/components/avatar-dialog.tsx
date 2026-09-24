"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const AVATAR_SIZE = 256;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PRESETS: { emoji: string; from: string; to: string }[] = [
    { emoji: "🦊", from: "#fb923c", to: "#ea580c" },
    { emoji: "🐼", from: "#94a3b8", to: "#475569" },
    { emoji: "🐯", from: "#fbbf24", to: "#d97706" },
    { emoji: "🐸", from: "#4ade80", to: "#16a34a" },
    { emoji: "🐧", from: "#38bdf8", to: "#0284c7" },
    { emoji: "🦄", from: "#f0abfc", to: "#c026d3" },
    { emoji: "🐻", from: "#d6a67a", to: "#92400e" },
    { emoji: "🚀", from: "#818cf8", to: "#4338ca" },
    { emoji: "🌸", from: "#fda4af", to: "#e11d48" },
    { emoji: "⭐", from: "#fde047", to: "#ca8a04" },
    { emoji: "🎧", from: "#5eead4", to: "#0d9488" },
    { emoji: "☕", from: "#a8a29e", to: "#57534e" },
];

function renderPreset(preset: (typeof PRESETS)[number]) {
    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    gradient.addColorStop(0, preset.from);
    gradient.addColorStop(1, preset.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
    ctx.font = `${AVATAR_SIZE * 0.55}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(preset.emoji, AVATAR_SIZE / 2, AVATAR_SIZE / 2 + AVATAR_SIZE * 0.04);
    return canvas.toDataURL("image/png");
}

/** Center-crops an uploaded image to a square and scales it down to AVATAR_SIZE. */
function resizeUpload(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
            const side = Math.min(img.naturalWidth, img.naturalHeight);
            const canvas = document.createElement("canvas");
            canvas.width = AVATAR_SIZE;
            canvas.height = AVATAR_SIZE;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);
            ctx.drawImage(
                img,
                (img.naturalWidth - side) / 2,
                (img.naturalHeight - side) / 2,
                side,
                side,
                0,
                0,
                AVATAR_SIZE,
                AVATAR_SIZE
            );
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Couldn't read that image."));
        };
        img.src = url;
    });
}

/** Round avatar: the image when there is one, otherwise the user's initials. */
export function UserAvatar({
    src,
    initials,
    size,
    className,
}: {
    src: string | null;
    initials: string;
    size: number;
    className?: string;
}) {
    if (src) {
        return (
            <Image
                src={src}
                alt="User avatar"
                width={size}
                height={size}
                unoptimized
                draggable={false}
                className={cn("shrink-0 rounded-full object-cover", className)}
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <span
            className={cn("flex shrink-0 items-center justify-center rounded-full bg-slate-500 font-bold uppercase text-white", className)}
            style={{ width: size, height: size, fontSize: size * 0.34 }}
        >
            {initials}
        </span>
    );
}

interface AvatarDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customAvatar: string | null;
    providerPhoto: string | null;
    initials: string;
    onSave: (avatarUrl: string | null) => Promise<{ success: boolean; message?: string }>;
}

export function AvatarDialog({ open, onOpenChange, customAvatar, providerPhoto, initials, onSave }: AvatarDialogProps) {
    // What the preview shows: a new pick, or null for "no custom avatar".
    const [pending, setPending] = useState<string | null>(customAvatar);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setPending(customAvatar);
            setError("");
        }
    }, [open, customAvatar]);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setError("Please choose an image file.");
            return;
        }
        if (file.size > MAX_UPLOAD_BYTES) {
            setError("Image must be under 10 MB.");
            return;
        }
        try {
            setError("");
            setPending(await resizeUpload(file));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Couldn't read that image.");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setError("");
        try {
            const res = await onSave(pending);
            if (res.success) onOpenChange(false);
            else setError(res.message || "Failed to save avatar.");
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const preview = pending || providerPhoto;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md glass-panel border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-6">
                <DialogHeader className="space-y-2">
                    <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90 font-outfit flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-500" />
                        <span>Profile Picture</span>
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Upload a photo or pick one of the avatars below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col items-center gap-3 pt-2">
                    <UserAvatar src={preview} initials={initials} size={112} className="border-4 border-white shadow-md dark:border-white/10" />
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="gap-1.5 rounded-lg">
                            <Upload className="h-3.5 w-3.5" />
                            Upload photo
                        </Button>
                        {pending && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setPending(null)} className="gap-1.5 rounded-lg text-muted-foreground">
                                <RotateCcw className="h-3.5 w-3.5" />
                                {providerPhoto ? "Use account photo" : "Remove"}
                            </Button>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                </div>

                <div className="grid grid-cols-6 gap-2 pt-2">
                    {PRESETS.map((preset) => (
                        <button
                            key={preset.emoji}
                            type="button"
                            onClick={() => setPending(renderPreset(preset))}
                            aria-label={`Use ${preset.emoji} avatar`}
                            className="flex aspect-square items-center justify-center rounded-full text-2xl shadow-sm transition-transform hover:scale-110 active:scale-95"
                            style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }}
                        >
                            {preset.emoji}
                        </button>
                    ))}
                </div>

                {error && <p className="text-xs text-destructive text-center font-medium">{error}</p>}

                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || pending === customAvatar}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-500/20 rounded-lg"
                >
                    {saving ? "Saving..." : "Save"}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
