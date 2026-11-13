"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, Pencil, Trash2 } from "lucide-react";
import { App } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_NOTE_FIELDS, APP_NOTE_LABELS, AppNote, AppNoteField, SECRET_NOTE_FIELDS, hasNoteContent } from "@/lib/app-notes";

/** Clipboard write with a fallback for non-secure (plain http) origins. */
async function copyText(text: string) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // fall through to the legacy path
    }
    try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(area);
        return ok;
    } catch {
        return false;
    }
}

function NoteRow({ field, value }: { field: AppNoteField; value: string }) {
    const secret = SECRET_NOTE_FIELDS.has(field);
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!copied) return;
        const t = window.setTimeout(() => setCopied(false), 1500);
        return () => window.clearTimeout(t);
    }, [copied]);

    const handleCopy = async () => {
        if (await copyText(value)) {
            navigator.vibrate?.(10);
            setCopied(true);
        }
    };

    return (
        <div className="flex items-center gap-2 border-t border-border py-2.5 first:border-t-0">
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{APP_NOTE_LABELS[field]}</div>
                <div className={cn("break-all text-[15px] text-foreground", secret && !revealed && "tracking-widest", field === "hint" && "whitespace-pre-wrap break-words")}>
                    {secret && !revealed ? "•".repeat(Math.min(value.length, 12)) : value}
                </div>
            </div>
            {secret && (
                <button
                    type="button"
                    onClick={() => setRevealed((r) => !r)}
                    aria-label={revealed ? `Hide ${APP_NOTE_LABELS[field]}` : `Show ${APP_NOTE_LABELS[field]}`}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground active:scale-95"
                >
                    {revealed ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
            )}
            <button
                type="button"
                onClick={handleCopy}
                aria-label={`Copy ${APP_NOTE_LABELS[field]}`}
                className={cn(
                    "flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors active:scale-95",
                    copied ? "bg-green-600/10 text-green-600 dark:text-green-400" : "bg-blue-600/10 text-blue-600 dark:text-blue-400"
                )}
            >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
            </button>
        </div>
    );
}

interface AppNotesSheetProps {
    app: App | null;
    note: AppNote | undefined;
    onOpenChange: (open: boolean) => void;
    onSave: (appId: string, note: AppNote) => Promise<{ success: boolean; message?: string }>;
    onLaunch: (app: App) => void;
}

/**
 * Bottom sheet with the user's saved login notes for one app: copy buttons
 * for each field, an Open button, and an inline editor.
 */
export function AppNotesSheet({ app, note, onOpenChange, onSave, onLaunch }: AppNotesSheetProps) {
    const hasNote = hasNoteContent(note);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState<AppNote>({});
    const [showSecrets, setShowSecrets] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // Reset whenever a different app is opened; start in the editor when there's nothing saved yet.
    const appId = app?.id ?? null;
    const [lastAppId, setLastAppId] = useState<string | null>(null);
    if (appId !== lastAppId) {
        setLastAppId(appId);
        setEditing(!hasNote);
        setDraft({ ...note });
        setShowSecrets(false);
        setError("");
    }

    const startEditing = () => {
        setDraft({ ...note });
        setError("");
        setEditing(true);
    };

    const handleSave = async (next: AppNote) => {
        if (!app) return;
        setSaving(true);
        setError("");
        const res = await onSave(app.id, next);
        setSaving(false);
        if (!res.success) {
            setError(res.message || "Couldn't save. Try again.");
            return;
        }
        if (hasNoteContent(next)) setEditing(false);
        else onOpenChange(false);
    };

    return (
        <Sheet open={!!app} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="mx-auto max-h-[88dvh] w-full gap-0 overflow-y-auto rounded-t-3xl border-x-0 p-0 pb-[env(safe-area-inset-bottom)] md:bottom-6 md:max-w-md md:rounded-3xl md:border"
            >
                <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25 md:hidden" aria-hidden="true" />
                {app && (
                    <div className="space-y-4 p-5 pt-3">
                        <div className="flex items-center gap-3 pr-8">
                            {app.iconUrl ? (
                                <Image src={app.iconUrl} alt="" width={40} height={40} unoptimized className="h-10 w-10 shrink-0 object-contain" />
                            ) : (
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-outfit text-lg font-bold uppercase text-white">
                                    {(app.name || "?").slice(0, 1)}
                                </span>
                            )}
                            <div className="min-w-0">
                                <SheetTitle className="truncate font-outfit text-lg font-bold">{app.name}</SheetTitle>
                                <SheetDescription className="flex items-center gap-1 text-xs">
                                    <KeyRound className="h-3 w-3" /> Your private login notes
                                </SheetDescription>
                            </div>
                        </div>

                        {editing ? (
                            <form
                                className="space-y-3"
                                onSubmit={(e) => { e.preventDefault(); handleSave(draft); }}
                                autoComplete="off"
                            >
                                {APP_NOTE_FIELDS.map((field) => {
                                    const secret = SECRET_NOTE_FIELDS.has(field);
                                    return (
                                        <label key={field} className="block space-y-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{APP_NOTE_LABELS[field]}</span>
                                            {field === "hint" ? (
                                                <textarea
                                                    value={draft.hint ?? ""}
                                                    onChange={(e) => setDraft((d) => ({ ...d, hint: e.target.value }))}
                                                    rows={2}
                                                    placeholder="Connect VPN first"
                                                    className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                                                />
                                            ) : (
                                                <div className="relative">
                                                    <Input
                                                        type={secret && !showSecrets ? "password" : "text"}
                                                        value={draft[field] ?? ""}
                                                        onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                                                        placeholder={field === "username" ? "name@company.com" : ""}
                                                        autoComplete="off"
                                                        autoCapitalize="off"
                                                        autoCorrect="off"
                                                        spellCheck={false}
                                                        data-1p-ignore
                                                        data-lpignore="true"
                                                        className={cn("h-11 text-base md:text-sm", secret && "pr-11")}
                                                    />
                                                    {secret && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowSecrets((s) => !s)}
                                                            aria-label={showSecrets ? "Hide secrets" : "Show secrets"}
                                                            className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground"
                                                        >
                                                            {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </label>
                                    );
                                })}
                                {error && <p className="text-sm text-destructive">{error}</p>}
                                <div className="flex gap-2 pt-1">
                                    {hasNote && (
                                        <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={() => setEditing(false)}>
                                            Cancel
                                        </Button>
                                    )}
                                    <Button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                                        {saving ? "Saving…" : "Save"}
                                    </Button>
                                </div>
                                {hasNote && (
                                    <button
                                        type="button"
                                        disabled={saving}
                                        onClick={() => { if (window.confirm(`Delete saved notes for ${app.name}?`)) handleSave({}); }}
                                        className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete notes
                                    </button>
                                )}
                            </form>
                        ) : (
                            <>
                                <div className="rounded-2xl border border-border bg-muted/30 px-3">
                                    {APP_NOTE_FIELDS.map((field) => note?.[field]
                                        ? <NoteRow key={`${app.id}-${field}`} field={field} value={note[field]!} />
                                        : null)}
                                </div>
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline" className="h-12 rounded-xl px-4" onClick={startEditing}>
                                        <Pencil className="h-4 w-4" /> Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        className="h-12 flex-1 rounded-xl bg-blue-600 text-base text-white hover:bg-blue-700"
                                        onClick={() => onLaunch(app)}
                                    >
                                        Open {app.name} <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
