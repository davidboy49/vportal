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

    return (
        <Card className="flex h-full flex-col transform-gpu transition-all duration-300 ease-out group hover:-translate-y-1.5 hover:scale-[1.02] hover:border-teal-500/20 dark:hover:border-white/20 hover:shadow-[0_8px_40px_rgba(13,148,136,0.12),0_2px_12px_rgba(30,64,175,0.08),inset_0_1px_0_rgba(255,255,255,0.8)] dark:hover:shadow-[0_8px_40px_rgba(13,148,136,0.25),0_2px_12px_rgba(30,64,175,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {app.iconUrl && <Image src={app.iconUrl} alt={app.name} width={40} height={40} unoptimized className="w-10 h-10 rounded-md object-contain bg-muted" />}
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleFavorite} disabled={loading}>
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-current text-red-500")} />
                    </Button>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2">
                    {(app.tags || []).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                </div>
            </CardContent>
            <CardFooter>
                <Button className="w-full gap-2" onClick={handleLaunch}>
                    Open <ExternalLink className="h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
    );
}
