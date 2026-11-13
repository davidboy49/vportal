"use client";

import { App } from "@/lib/types";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Heart, KeyRound } from "lucide-react";
import { useAppNotesContext } from "@/hooks/use-app-notes";
import { hasNoteContent } from "@/lib/app-notes";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { launchApp } from "@/lib/launch";
import { useToggleFavorite } from "@/hooks/use-toggle-favorite";

interface AppCardProps {
    app: App;
    isFavorite: boolean;
    onToggleFavorite: (id: string, isFav: boolean) => void;
}

export function AppCard({ app, isFavorite, onToggleFavorite }: AppCardProps) {
    const { user } = useAuth();
    const { handleFavorite, loading } = useToggleFavorite(app, isFavorite, onToggleFavorite);

    const notesCtx = useAppNotesContext();
    const hasNotes = hasNoteContent(notesCtx?.notes[app.id]);

    const handleLaunch = () => launchApp(user, app);

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
                    <div className="flex shrink-0 items-center">
                        {notesCtx && (
                            <Button
                                variant="ghost"
                                size="icon"
                                title={hasNotes ? "Login notes" : "Add login notes"}
                                aria-label={hasNotes ? `Login notes for ${app.name}` : `Add login notes for ${app.name}`}
                                className={cn(
                                    "h-8 w-8 rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5",
                                    hasNotes ? "text-amber-500" : "text-muted-foreground/60 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-amber-500"
                                )}
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); notesCtx.openNotes(app); }}
                            >
                                <KeyRound className="h-4 w-4" />
                            </Button>
                        )}
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

