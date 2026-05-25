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
import { ThemeToggle } from "@/components/theme-toggle";
import { db } from "@/lib/firebase/client";
import { collection, query, getDocs, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface DashboardClientProps {
    initialApps: App[];
    categories: Category[];
    globalSettings?: {
        portalName?: string;
        logoUrl?: string;
    };
}

export function DashboardClient({
    initialApps,
    categories: initialCategories,
    globalSettings
}: DashboardClientProps) {
    const { loading } = useRequireAuth();
    const { user, signOut } = useAuth();
    const [apps, setApps] = useState<App[]>(initialApps);
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [favorites, setFavorites] = useState<Set<string>>(new Set());
    const [recent, setRecent] = useState<string[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [categoryOrderIds, setCategoryOrderIds] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    const [draggingCategoryId, setDraggingCategoryId] = useState<string | null>(null);

    const orderedCategories = useMemo(() => {
        const categoriesById = new Map(categories.map((category) => [category.id, category]));
        const orderIds = mounted ? categoryOrderIds : categories.map((c) => c.id);
        const preferredCategories = orderIds
            .map((categoryId) => categoriesById.get(categoryId))
            .filter((category): category is Category => Boolean(category));
        const missingCategories = categories.filter((category) => !orderIds.includes(category.id));

        return [...preferredCategories, ...missingCategories];
    }, [categories, categoryOrderIds, mounted]);

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

    // Real-time synchronization and user-specific data fetching
    useEffect(() => {
        if (!user || !db) return;

        // Real-time listener for apps
        const appsQuery = query(collection(db, "apps"));
        const unsubscribeApps = onSnapshot(appsQuery, (snapshot) => {
            const allApps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as App[];
            setApps(allApps.filter(app => app.isActive !== false));
        }, (error) => console.error("Error fetching apps:", error));

        // Real-time listener for categories
        const categoriesQuery = query(collection(db, "categories"));
        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const allCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[];
            setCategories(allCategories.filter(cat => cat.isActive !== false));
        }, (error) => console.error("Error fetching categories:", error));

        const fetchUserData = async () => {
            try {
                const favoritesSnapshot = await getDocs(collection(db, "users", user.uid, "favorites"));
                setFavorites(new Set(favoritesSnapshot.docs.map(doc => doc.id)));

                const recentQuery = query(collection(db, "users", user.uid, "recent"), orderBy("lastOpenedAt", "desc"), limit(10));
                const recentSnapshot = await getDocs(recentQuery);
                setRecent(recentSnapshot.docs.map(doc => doc.id));
            } catch (error) {
                console.error("Error fetching user data:", error);
            }
        };

        fetchUserData();

        return () => {
            unsubscribeApps();
            unsubscribeCategories();
        };
    }, [user]);

    // Initialize category ordering on mount
    useEffect(() => {
        setMounted(true);
        if (!initialCategories) return;
        try {
            const storedOrder = window.localStorage.getItem("vportal-category-order");
            if (storedOrder) {
                const parsed = JSON.parse(storedOrder);
                if (Array.isArray(parsed)) {
                    setCategoryOrderIds(parsed);
                    return;
                }
            }
        } catch {
            // ignore
        }
        setCategoryOrderIds(categories.map((c) => c.id));
    }, [categories, initialCategories]);

    const filteredApps = useMemo(() => {
        const categoryOrder = new Map(orderedCategories.map((category, index) => [category.id, index]));

        return apps
            .filter(app => {
                const matchesSearch = (app.name || "").toLowerCase().includes(search.toLowerCase()) ||
                    (app.description || "").toLowerCase().includes(search.toLowerCase()) ||
                    (app.tags || []).some(tag => tag.toLowerCase().includes(search.toLowerCase()));
                const matchesCategory = selectedCategory ? app.categoryId === selectedCategory : true;
                return matchesSearch && matchesCategory;
            })
            .sort((a, b) => {
                const categoryIndexA = categoryOrder.get(a.categoryId) ?? Number.MAX_SAFE_INTEGER;
                const categoryIndexB = categoryOrder.get(b.categoryId) ?? Number.MAX_SAFE_INTEGER;
                if (categoryIndexA !== categoryIndexB) {
                    return categoryIndexA - categoryIndexB;
                }
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [apps, orderedCategories, search, selectedCategory]);

    const recentApps = useMemo(() => {
        const recentOrder = new Map(recent.map((appId, index) => [appId, index]));

        return apps
            .filter((app) => recentOrder.has(app.id))
            .sort((a, b) => (recentOrder.get(a.id) ?? 0) - (recentOrder.get(b.id) ?? 0));
    }, [apps, recent]);

    const favoriteApps = useMemo(() => {
        return apps.filter(app => favorites.has(app.id));
    }, [apps, favorites]);

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

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                {!db ? (
                    <div className="text-center p-6 max-w-md bg-red-50 text-red-800 border border-red-200 rounded-lg">
                        <h2 className="font-bold text-lg mb-2">Database Initialization Error</h2>
                        <p className="text-sm">Cloud Firestore could not be initialized. Please check your Firebase configuration in your <code>.env.local</code> file.</p>
                    </div>
                ) : (
                    "Loading..."
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="glass-panel flex flex-col md:flex-row justify-between items-center gap-4 p-4 rounded-xl text-card-foreground transition-all duration-300">
                <div className="flex items-center gap-3">
                    {globalSettings?.logoUrl && (
                        <Image
                            src={globalSettings.logoUrl}
                            alt={globalSettings.portalName || "Portal Logo"}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-md object-contain border border-black/5 dark:border-white/5 p-1 bg-white/50 dark:bg-black/20"
                        />
                    )}
                    <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent font-outfit">
                        {globalSettings?.portalName || "VPortal"}
                    </h1>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-teal-500" />
                        <Input
                            type="search"
                            placeholder="Search apps..."
                            className="pl-8 bg-background/30 border-black/10 dark:border-white/10 focus:bg-background/80 focus:border-teal-500/50 dark:focus:border-teal-500/40 focus:ring-1 focus:ring-teal-500/30 transition-all duration-300 rounded-lg shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {isAdmin && (
                        <Button variant="outline" asChild className="border-border/60 hover:bg-accent rounded-lg transition-all duration-300">
                            <Link href="/admin">Go to Admin</Link>
                        </Button>
                    )}
                    <ThemeToggle />
                    <Button variant="outline" onClick={() => signOut()} className="border-border/60 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-all duration-300">Logout</Button>
                </div>
            </div>

            {/* Categories */}
            <div className="flex flex-wrap gap-2">
                <Badge
                    variant={selectedCategory === null ? "default" : "outline"}
                    className={cn(
                        "cursor-pointer px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 select-none",
                        selectedCategory === null 
                            ? "bg-teal-600 dark:bg-teal-500 text-white shadow-md shadow-teal-500/20" 
                            : "bg-white/40 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                    )}
                    onClick={() => setSelectedCategory(null)}
                >
                    All
                </Badge>
                {orderedCategories.map(cat => (
                    <Badge
                        key={cat.id}
                        variant={selectedCategory === cat.id ? "default" : "outline"}
                        className={cn(
                            "cursor-pointer px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 select-none",
                            selectedCategory === cat.id 
                                ? "bg-teal-600 dark:bg-teal-500 text-white shadow-md shadow-teal-500/20" 
                                : "bg-white/40 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                        )}
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
                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">Favorites</h2>
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
                <section className="space-y-4">
                    <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">Recent</h2>
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
            <section className="space-y-4">
                <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">All Apps</h2>
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
                        <p className="text-muted-foreground col-span-full py-8 text-center glass-panel rounded-xl border-dashed">No apps found matching your criteria.</p>
                    )}
                </div>
            </section>
        </div>
    );
}

