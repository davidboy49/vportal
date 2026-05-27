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

export function AppCard({ app, isFavorite, onToggleFavorite }: AppCardProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        // Optimistic update
        onToggleFavorite(app.id, !isFavorite);

        const isGuest = user.isAnonymous || user.email === "guest@vportal.com";
        if (isGuest) {
            try {
                const storedFavs = localStorage.getItem("vportal_guest_favorites") || "[]";
                const favsList: string[] = JSON.parse(storedFavs);
                let nextList: string[];
                if (favsList.includes(app.id)) {
                    nextList = favsList.filter(id => id !== app.id);
                } else {
                    nextList = [...favsList, app.id];
                }
                localStorage.setItem("vportal_guest_favorites", JSON.stringify(nextList));
                window.dispatchEvent(new Event("vportal_guest_data_updated"));
            } catch (err) {
                console.error("Failed to save guest favorites", err);
                onToggleFavorite(app.id, isFavorite);
            }
            return;
        }

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
            const isGuest = user.isAnonymous || user.email === "guest@vportal.com";
            if (!isGuest) {
                user.getIdToken().then(token => logRecentApp(token, app.id));
            } else {
                try {
                    const stored = localStorage.getItem("vportal_guest_recent") || "[]";
                    const recentList: string[] = JSON.parse(stored);
                    const filtered = recentList.filter(id => id !== app.id);
                    filtered.unshift(app.id);
                    localStorage.setItem("vportal_guest_recent", JSON.stringify(filtered.slice(0, 10)));
                    window.dispatchEvent(new Event("vportal_guest_data_updated"));
                } catch (e) {
                    console.error("Failed to log guest recent app", e);
                }
            }
        }
        window.open(app.url, "_blank");
    };

    return (
        <Card className={cn(
            "glass-card flex h-full flex-col transform-gpu transition-all duration-300 ease-out group hover:-translate-y-1.5 hover:scale-[1.02] border-black/5 dark:border-white/5",
            "hover:border-blue-500/30 hover:shadow-[0_12px_24px_-8px_rgba(100,116,139,0.15)] dark:hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)]"
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
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide transition-all duration-300 bg-slate-500/5 border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"
                        >
                            {tag}
                        </Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="pt-0">
                <Button
                    className="w-full gap-2 transition-all duration-300 bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    onClick={handleLaunch}
                >
                    Open
                    <ExternalLink className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Button>
            </CardFooter>
        </Card>
    );
}

