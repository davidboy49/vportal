"use client";

import { App } from "@/lib/types";
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
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        {app.iconUrl && <img src={app.iconUrl} alt={app.name} className="w-10 h-10 rounded-md object-contain bg-muted" />}
                        <CardTitle className="text-lg">{app.name}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={handleFavorite}>
                        <Heart className={cn("h-5 w-5", isFavorite && "fill-current text-red-500")} />
                    </Button>
                </div>
                <CardDescription className="line-clamp-2 min-h-[40px]">{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <div className="flex flex-wrap gap-2">
                    {app.tags.map(tag => (
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
