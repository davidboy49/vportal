"use client";

import { useState, useMemo } from "react";
import { App, Category } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { AppCard } from "./app-card";
import { useAuth } from "@/context/AuthContext";
import { bootstrapAdmin } from "@/actions/auth";

interface DashboardClientProps {
    initialApps: App[];
    categories: Category[];
    initialFavorites: string[];
    initialRecent: string[];
}

export function DashboardClient({
    initialApps,
    categories,
    initialFavorites,
    initialRecent
}: DashboardClientProps) {
    const { user, signOut } = useAuth();
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set(initialFavorites));

    // Bootstrap admin on load if needed
    useState(() => {
        if (user) {
            user.getIdToken().then(token => bootstrapAdmin(token));
        }
    });

    const filteredApps = useMemo(() => {
        return initialApps.filter(app => {
            const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
                app.description?.toLowerCase().includes(search.toLowerCase()) ||
                app.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
            const matchesCategory = selectedCategory ? app.categoryId === selectedCategory : true;
            return matchesSearch && matchesCategory;
        });
    }, [initialApps, search, selectedCategory]);

    const recentApps = useMemo(() => {
        return initialApps.filter(app => initialRecent.includes(app.id));
    }, [initialApps, initialRecent]);

    const favoriteApps = useMemo(() => {
        return initialApps.filter(app => favorites.has(app.id));
    }, [initialApps, favorites]);

    return (
        <div className="min-h-screen bg-background p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">App Portal</h1>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search apps..."
                            className="pl-8"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" onClick={() => signOut()}>Logout</Button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
                <Badge
                    variant={selectedCategory === null ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => setSelectedCategory(null)}
                >
                    All
                </Badge>
                {categories.map(cat => (
                    <Badge
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory(cat.id)}
                    >
                        {cat.name}
                    </Badge>
                ))}
            </div>

            {/* Favorites Section */}
            {favoriteApps.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4">Favorites</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {favoriteApps.map(app => (
                            <AppCard key={app.id} app={app} isFavorite={true} onToggleFavorite={(id, isFav) => {
                                const next = new Set(favorites);
                                if (isFav) next.add(id); else next.delete(id);
                                setFavorites(next);
                            }} />
                        ))}
                    </div>
                </section>
            )}

            {/* Main Grid */}
            <section>
                <h2 className="text-xl font-semibold mb-4">All Apps</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {filteredApps.map(app => (
                        <AppCard
                            key={app.id}
                            app={app}
                            isFavorite={favorites.has(app.id)}
                            onToggleFavorite={(id, isFav) => {
                                const next = new Set(favorites);
                                if (isFav) next.add(id); else next.delete(id);
                                setFavorites(next);
                            }}
                        />
                    ))}
                    {filteredApps.length === 0 && (
                        <p className="text-muted-foreground col-span-full">No apps found.</p>
                    )}
                </div>
            </section>
        </div>
    );
}
