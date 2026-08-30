"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { App } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { launchApp } from "@/lib/launch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, CornerDownLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
    apps: App[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ apps, open, onOpenChange }: CommandPaletteProps) {
    const { user } = useAuth();
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Reset search state when the dialog transitions to open - adjusting
    // state during render (not in an effect) per React's guidance for
    // resetting state in response to a prop change.
    const [prevOpen, setPrevOpen] = useState(open);
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setQuery("");
            setActiveIndex(0);
        }
    }

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return apps.slice(0, 8);
        return apps
            .filter(app =>
                (app.name || "").toLowerCase().includes(q) ||
                (app.description || "").toLowerCase().includes(q) ||
                (app.tags || []).some(tag => tag.toLowerCase().includes(q))
            )
            .slice(0, 8);
    }, [apps, query]);

    // Focusing the input is a genuine side effect (imperative DOM API), not state.
    useEffect(() => {
        if (!open) return;
        const id = setTimeout(() => inputRef.current?.focus(), 0);
        return () => clearTimeout(id);
    }, [open]);

    const handleLaunch = (app: App) => {
        launchApp(user, app);
        onOpenChange(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, results.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const app = results[activeIndex];
            if (app) handleLaunch(app);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-lg p-0 gap-0 overflow-hidden rounded-2xl top-[20%] translate-y-0"
            >
                <DialogTitle className="sr-only">Search apps</DialogTitle>
                <div className="flex items-center gap-2 border-b border-border px-4">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                        onKeyDown={handleKeyDown}
                        placeholder="Search apps to launch..."
                        className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                        Esc
                    </kbd>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar p-2">
                    {results.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No apps found.</p>
                    ) : (
                        results.map((app, index) => (
                            <button
                                key={app.id}
                                onClick={() => handleLaunch(app)}
                                onMouseEnter={() => setActiveIndex(index)}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                    index === activeIndex ? "bg-primary/10" : "hover:bg-muted/60"
                                )}
                            >
                                {app.iconUrl ? (
                                    <Image
                                        src={app.iconUrl}
                                        alt={app.name}
                                        width={28}
                                        height={28}
                                        unoptimized
                                        className="w-7 h-7 rounded object-contain bg-background border border-border shrink-0"
                                    />
                                ) : (
                                    <div className="w-7 h-7 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase shrink-0">
                                        {app.name.substring(0, 2)}
                                    </div>
                                )}
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium truncate">{app.name}</p>
                                    {app.description && (
                                        <p className="text-xs text-muted-foreground truncate">{app.description}</p>
                                    )}
                                </div>
                                {index === activeIndex ? (
                                    <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                ) : (
                                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                                )}
                            </button>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
