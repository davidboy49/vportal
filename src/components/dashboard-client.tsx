"use client";

import { useEffect, useMemo, useState } from "react";
import { App, Category } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";
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
    const [isAdmin, setIsAdmin] = useState(false);
    const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return categories.map((category) => category.id);

        try {
            const storedOrder = window.localStorage.getItem("vportal-category-order");
            if (!storedOrder) return categories.map((category) => category.id);
            const parsed = JSON.parse(storedOrder);
            return Array.isArray(parsed) ? parsed : categories.map((category) => category.id);
        } catch {
            return categories.map((category) => category.id);
        }
    });
    const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);


    const orderedCategories = useMemo(() => {
        const categoriesById = new Map(categories.map((category) => [category.id, category]));
        const preferredCategories = categoryOrderIds
            .map((categoryId) => categoriesById.get(categoryId))
            .filter((category): category is Category => Boolean(category));
        const missingCategories = categories.filter((category) => !categoryOrderIds.includes(category.id));

        return [...preferredCategories, ...missingCategories];
    }, [categories, categoryOrderIds]);

    // Bootstrap admin on load if needed
    useEffect(() => {
        const bootstrapAndCheckRole = async () => {
            if (!user) {
                setIsAdmin(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                await bootstrapAdmin(token);
                const tokenResult = await user.getIdTokenResult(true);
                setIsAdmin(tokenResult.claims.role === "ADMIN");
            } catch {
                setIsAdmin(false);
            }
        };

        bootstrapAndCheckRole();
    }, [user]);

    const filteredApps = useMemo(() => {
        const categoryOrder = new Map(orderedCategories.map((category, index) => [category.id, index]));

        return initialApps
            .filter(app => {
                const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
                    app.description?.toLowerCase().includes(search.toLowerCase()) ||
                    app.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
                const matchesCategory = selectedCategory ? app.categoryId === selectedCategory : true;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                const categoryIndexA = categoryOrder.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
                const categoryIndexB = categoryOrder.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
                if (categoryIndexA !== categoryIndexB) {
                    return categoryIndexA - categoryIndexB;
                }
                return a.name.localeCompare(b.name);
            });
    }, [initialApps, orderedCategories, search, selectedCategory]);

    const recentApps = useMemo(() => {
        const recentOrder = new Map(initialRecent.map((appId, index) => [appId, index]));

        return initialApps
            .filter((app) => recentOrder.has(app.id))
            .sort((a, b) => (recentOrder.get(a.id) ?? 0) - (recentOrder.get(b.id) ?? 0));
    }, [initialApps, initialRecent]);

    const favoriteApps = useMemo(() => {
        return initialApps.filter(app => favorites.has(app.id));
    }, [initialApps, favorites]);

    const moveCategory = (fromCategoryId: string, toCategoryId: string) => {
        if (fromCategoryId === toCategoryId) return;

        setCategoryOrderIds((current) => {
            const categoryIds = new Set(categories.map((category) => category.id));
            const currentOrder = current.filter((id) => categoryIds.has(id));
            const missingIds = categories.map((category) => category.id).filter((id) => !currentOrder.includes(id));
            const normalizedOrder = [...currentOrder, ...missingIds];

            const fromIndex = normalizedOrder.findIndex((id) => id === fromCategoryId);
            const toIndex = normalizedOrder.findIndex((id) => id === toCategoryId);
            if (fromIndex === -1 || toIndex === -1) return current;

            const next = [...normalizedOrder];
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            window.localStorage.setItem("vportal-category-order", JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-background p-6 space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight">VPortal by ViD</h1>
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
                    {isAdmin && (
                        <Button variant="outline" asChild>
                            <Link href="/admin">Go to Admin</Link>
                        </Button>
                    )}
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
                {orderedCategories.map(cat => (
                    <Badge
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory(cat.id)}
                        draggable
                        onDragStart={() => setDraggingCategoryId(cat.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                            if (!draggingCategoryId) return;
                            moveCategory(draggingCategoryId, cat.id);
                            setDraggingCategoryId(null);
                        }}
                        onDragEnd={() => setDraggingCategoryId(null)}
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

            {/* Recent Section */}
            {recentApps.length > 0 && (
                <section>
                    <h2 className="text-xl font-semibold mb-4">Recent</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {recentApps.map(app => (
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
