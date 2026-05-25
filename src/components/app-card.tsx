"use client";

import { App } from "@/lib/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Heart } from "lucide-react";
import { toggleFavorite, logRecentApp } from "@/actions/user-ops";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AppCardProps {
    app: App;
    isFavorite: boolean;
    onToggleFavorite: (id: string, isFav: boolean) => void;
}

const categoryGlowStyles: Record<string, { border: string; glow: string; badge: string }> = {
    productivity: {
        border: "hover:border-teal-500/50 dark:hover:border-teal-500/30",
        glow: "hover:shadow-[0_12px_40px_-8px_rgba(20,184,166,0.18)] dark:hover:shadow-[0_12px_40px_-8px_rgba(20,184,166,0.3)]",
        badge: "bg-teal-500/5 text-teal-600 dark:text-teal-400 border-teal-500/20"
    },
    development: {
        border: "hover:border-violet-500/50 dark:hover:border-violet-500/30",
        glow: "hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.18)] dark:hover:shadow-[0_12px_40px_-8px_rgba(139,92,246,0.3)]",
        badge: "bg-violet-500/5 text-violet-600 dark:text-violet-400 border-violet-500/20"
    },
    finance: {
        border: "hover:border-amber-500/50 dark:hover:border-amber-500/30",
        glow: "hover:shadow-[0_12px_40px_-8px_rgba(245,158,11,0.15)] dark:hover:shadow-[0_12px_40px_-8px_rgba(245,158,11,0.25)]",
        badge: "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20"
    },
    hr: {
        border: "hover:border-rose-500/50 dark:hover:border-rose-500/30",
        glow: "hover:shadow-[0_12px_40px_-8px_rgba(244,63,94,0.18)] dark:hover:shadow-[0_12px_40px_-8px_rgba(244,63,94,0.3)]",
        badge: "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/20"
    },
    uncategorized: {
        border: "hover:border-slate-500/50 dark:hover:border-slate-500/30",
        glow: "hover:shadow-[0_12px_40px_-8px_rgba(100,116,139,0.15)] dark:hover:shadow-[0_12px_40px_-8px_rgba(100,116,139,0.2)]",
        badge: "bg-slate-500/5 text-slate-600 dark:text-slate-400 border-slate-500/20"
    }
};

export function AppCard({ app, isFavorite, onToggleFavorite }: AppCardProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        // Optimistic update
        onToggleFavorite(app.id, !isFavorite);

        try {
            setLoading(true);
            const token = await user.getIdToken();
            await toggleFavorite(token, app.id);
        } catch (err) {
            console.error("Failed to toggle favorite", err);
            // Revert on error
            onToggleFavorite(app.id, isFavorite);
        } finally {
            setLoading(false);
        }
    };

    const handleLaunch = async () => {
        if (user) {
            user.getIdToken().then(token => logRecentApp(token, app.id));
        }
        window.open(app.url, "_blank");
    };

    const style = categoryGlowStyles[app.categoryId] || categoryGlowStyles.uncategorized;

    return (
        <Card className={cn(
            "glass-card flex h-full flex-col transform-gpu transition-all duration-300 ease-out group hover:-translate-y-1.5 hover:scale-[1.02] border-black/5 dark:border-white/5",
            style.border,
            style.glow
        )}>
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {app.iconUrl && (
                            <Image
                                src={app.iconUrl}
                                alt={app.name}
                                width={40}
                                height={40}
                                unoptimized
                                className="w-10 h-10 rounded-md object-contain bg-background/50 border border-black/5 dark:border-white/5 p-1 shadow-sm"
                            />
                        )}
                        <CardTitle className="text-lg font-semibold tracking-tight transition-colors duration-300 group-hover:text-primary dark:group-hover:text-white">{app.name}</CardTitle>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-red-500 rounded-lg transition-colors"
                        onClick={handleFavorite}
                        disabled={loading}
                    >
                        <Heart className={cn("h-5 w-5 transition-transform duration-300 active:scale-75", isFavorite && "fill-current text-red-500")} />
                    </Button>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px] text-sm text-muted-foreground/95 mt-1">{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
                <div className="flex flex-wrap gap-1.5">
                    {(app.tags || []).map(tag => (
                        <Badge
                            key={tag}
                            variant="outline"
                            className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide transition-all duration-300", style.badge)}
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button
                    className="w-full gap-2 transition-all duration-300 bg-teal-600/90 dark:bg-teal-500/95 hover:bg-teal-600 dark:hover:bg-teal-500 shadow-md group-hover:bg-gradient-to-r group-hover:from-teal-500 group-hover:to-blue-600 group-hover:text-white"
                    onClick={handleLaunch}
                >
                    Open
                    <ExternalLink className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
            </CardFooter>
        </Card>
    );
}

