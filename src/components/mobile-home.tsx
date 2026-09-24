"use client";

import Image from "next/image";
import { User } from "firebase/auth";
import { App, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { launchApp } from "@/lib/launch";
import { useToggleFavorite } from "@/hooks/use-toggle-favorite";
import { ChevronRight, Clock, Heart, Home, LayoutGrid, Menu, Search } from "lucide-react";

export type MobileView = "dashboard" | "favorites" | "recent";

interface MobileHomeProps {
    user: User | null;
    isAdmin: boolean;
    portalName: string;
    logoUrl: string;
    selectedView: MobileView;
    onSelectView: (view: MobileView) => void;
    selectedCategory: string | null;
    onSelectCategory: (categoryId: string | null) => void;
    categories: Category[];
    categoryCounts: Record<string, number>;
    visibleApps: App[];
    filteredApps: App[];
    favoriteApps: App[];
    recentApps: App[];
    favorites: Set<string>;
    onToggleFavorite: (id: string, isFav: boolean) => void;
    onOpenSearch: () => void;
    onOpenMenu: () => void;
    onOpenPin: () => void;
}

// Frosted tile surface shared by every card on the mobile home screen.
const tileSurface =
    "rounded-2xl border border-white/80 bg-white/70 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06]";

function AppIcon({ app, size }: { app: App; size: number }) {
    if (app.iconUrl) {
        return (
            <Image
                src={app.iconUrl}
                alt={app.name}
                width={size}
                height={size}
                unoptimized
                className="object-contain"
                style={{ width: size, height: size }}
            />
        );
    }
    return (
        <div
            className="flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 font-bold text-white font-outfit uppercase"
            style={{ width: size, height: size, fontSize: size * 0.42 }}
        >
            {(app.name || "?").slice(0, 1)}
        </div>
    );
}

/** Wide tile: icon on the left, label on the right (top row of the home grid). */
function WideTile({ app, user }: { app: App; user: User | null }) {
    return (
        <button
            type="button"
            onClick={() => launchApp(user, app)}
            className={cn(tileSurface, "flex min-h-[72px] items-center gap-3 px-4 py-3 text-left transition-transform active:scale-[0.97]")}
        >
            <span className="shrink-0"><AppIcon app={app} size={40} /></span>
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">{app.name}</span>
        </button>
    );
}

/** Square tile: large icon above a centered label. */
function SquareTile({
    app,
    user,
    isFavorite,
    onToggleFavorite,
}: {
    app: App;
    user: User | null;
    isFavorite: boolean;
    onToggleFavorite: (id: string, isFav: boolean) => void;
}) {
    const { handleFavorite, loading } = useToggleFavorite(app, isFavorite, onToggleFavorite);

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => launchApp(user, app)}
                className={cn(tileSurface, "flex aspect-square w-full flex-col items-center justify-center gap-2 p-2 transition-transform active:scale-[0.97]")}
            >
                <AppIcon app={app} size={44} />
                <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight text-foreground">{app.name}</span>
            </button>
            <button
                type="button"
                onClick={handleFavorite}
                disabled={loading}
                aria-label={isFavorite ? `Remove ${app.name} from favorites` : `Add ${app.name} to favorites`}
                className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70"
            >
                <Heart className={cn("h-4 w-4 transition-transform active:scale-75", isFavorite && "fill-current text-red-500")} />
            </button>
        </div>
    );
}

/** Round shortcut used in the horizontal "Recent" strip. */
function ShortcutItem({ app, user }: { app: App; user: User | null }) {
    return (
        <button
            type="button"
            onClick={() => launchApp(user, app)}
            className="flex w-[72px] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
        >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-white/10">
                <AppIcon app={app} size={34} />
            </span>
            <span className="line-clamp-2 text-center text-[11px] font-medium leading-tight text-foreground/85">{app.name}</span>
        </button>
    );
}

function EmptyState({ children }: { children: React.ReactNode }) {
    return <p className={cn(tileSurface, "px-4 py-10 text-center text-sm text-muted-foreground")}>{children}</p>;
}

export function MobileHome({
    user,
    isAdmin,
    portalName,
    logoUrl,
    selectedView,
    onSelectView,
    selectedCategory,
    onSelectCategory,
    categories,
    categoryCounts,
    visibleApps,
    filteredApps,
    favoriteApps,
    recentApps,
    favorites,
    onToggleFavorite,
    onOpenSearch,
    onOpenMenu,
    onOpenPin,
}: MobileHomeProps) {
    const displayName = user?.displayName || (user?.isAnonymous ? "Guest" : user?.email?.split("@")[0]) || "there";
    const initials = (user?.displayName || user?.email || "U").slice(0, 2);

    // Big home tiles: the user's favorites, or the first apps when they have none yet.
    const featuredApps = (favoriteApps.length > 0 ? favoriteApps : filteredApps).slice(0, 8);
    const wideApps = featuredApps.slice(0, 2);
    const squareApps = featuredApps.slice(2);

    const renderSquareGrid = (list: App[]) => (
        <div className="grid grid-cols-3 gap-3">
            {list.map(app => (
                <SquareTile
                    key={app.id}
                    app={app}
                    user={user}
                    isFavorite={favorites.has(app.id)}
                    onToggleFavorite={onToggleFavorite}
                />
            ))}
        </div>
    );

    const navItems: { key: MobileView | "menu"; label: string; icon: typeof Home }[] = [
        { key: "dashboard", label: "Home", icon: Home },
        { key: "favorites", label: "Favorites", icon: Heart },
        { key: "recent", label: "Recent", icon: Clock },
        { key: "menu", label: "Menu", icon: Menu },
    ];

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-b from-sky-200/80 via-sky-50 to-background pb-28 dark:from-sky-950/60 dark:via-background dark:to-background md:hidden">
            {/* Top bar: brand on the left, actions on the right */}
            <header className="flex items-center justify-between px-5 pb-2 pt-5">
                <div className="flex min-w-0 items-center gap-2.5">
                    <Image
                        src={logoUrl}
                        alt={portalName}
                        width={40}
                        height={40}
                        unoptimized
                        className="h-10 w-10 rounded-full border border-black/5 bg-white object-cover p-0.5 shadow-sm dark:border-white/10"
                    />
                    <span className="truncate text-2xl font-extrabold tracking-tight text-foreground font-outfit">{portalName}</span>
                </div>
                <button
                    type="button"
                    onClick={onOpenSearch}
                    aria-label="Search apps"
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/30 active:scale-95"
                >
                    <Search className="h-5 w-5" />
                </button>
            </header>

            {/* Greeting */}
            <button type="button" onClick={onOpenPin} className="flex w-full items-center gap-3 px-5 py-3 text-left">
                {user?.photoURL ? (
                    <Image
                        src={user.photoURL}
                        alt="User Avatar"
                        width={56}
                        height={56}
                        unoptimized
                        className="h-14 w-14 rounded-full border-2 border-white object-cover shadow-sm dark:border-white/10"
                    />
                ) : (
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-500 text-lg font-bold uppercase text-white shadow-sm">
                        {initials}
                    </span>
                )}
                <span className="min-w-0">
                    <span className="block truncate text-lg font-bold text-foreground font-outfit">Hello, {displayName}</span>
                    <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                        {user?.isAnonymous ? "Guest Session" : isAdmin ? "Administrator" : "Profile & Login PIN"}
                        <ChevronRight className="h-4 w-4" />
                    </span>
                </span>
            </button>

            <div className="space-y-4 px-4">
                {/* Summary card (the "balance" card) */}
                <div className={cn(tileSurface, "flex items-center gap-4 p-4")}>
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[6px] border-blue-600/90 dark:border-blue-500">
                        <div className="flex flex-col items-center">
                            <LayoutGrid className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                            <span className="mt-1 text-[11px] font-semibold text-muted-foreground">Apps</span>
                        </div>
                    </div>
                    <div className="grid flex-1 grid-cols-3 gap-2 text-center">
                        <div>
                            <div className="text-2xl font-bold text-foreground font-outfit">{visibleApps.length}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Total</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground font-outfit">{favorites.size}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Favorites</div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-foreground font-outfit">{recentApps.length}</div>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Recent</div>
                        </div>
                    </div>
                </div>

                {selectedView === "dashboard" && (
                    <>
                        {/* Featured tiles: 2 wide on top, then a 3-column grid */}
                        {featuredApps.length > 0 && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {wideApps.map(app => <WideTile key={app.id} app={app} user={user} />)}
                                </div>
                                {squareApps.length > 0 && renderSquareGrid(squareApps)}
                            </div>
                        )}

                        {/* Recent shortcuts strip */}
                        {recentApps.length > 0 && (
                            <div className={cn(tileSurface, "py-4")}>
                                <div className="flex gap-2 overflow-x-auto px-3 custom-scrollbar">
                                    {recentApps.map(app => <ShortcutItem key={app.id} app={app} user={user} />)}
                                </div>
                            </div>
                        )}

                        {/* All apps, filterable by category */}
                        <section className="space-y-3 pt-2">
                            <h2 className="px-1 text-lg font-bold text-foreground font-outfit">All Apps</h2>
                            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 custom-scrollbar">
                                {[{ id: null as string | null, name: "All", count: visibleApps.length }, ...categories.map(c => ({ id: c.id as string | null, name: c.name, count: categoryCounts[c.id] || 0 }))].map(chip => (
                                    <button
                                        key={chip.id ?? "all"}
                                        type="button"
                                        onClick={() => onSelectCategory(chip.id)}
                                        className={cn(
                                            "shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
                                            selectedCategory === chip.id
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                                : "border border-black/10 bg-white/70 text-foreground dark:border-white/10 dark:bg-white/5"
                                        )}
                                    >
                                        {chip.name} ({chip.count})
                                    </button>
                                ))}
                            </div>
                            {filteredApps.length > 0
                                ? renderSquareGrid(filteredApps)
                                : <EmptyState>No apps found in this category.</EmptyState>}
                        </section>
                    </>
                )}

                {selectedView === "favorites" && (
                    <section className="space-y-3">
                        <h2 className="px-1 text-lg font-bold text-foreground font-outfit">Favorites</h2>
                        {favoriteApps.length > 0
                            ? renderSquareGrid(favoriteApps)
                            : <EmptyState>No favorites yet. Tap the heart on any app to pin it here.</EmptyState>}
                    </section>
                )}

                {selectedView === "recent" && (
                    <section className="space-y-3">
                        <h2 className="px-1 text-lg font-bold text-foreground font-outfit">Recently Opened</h2>
                        {recentApps.length > 0
                            ? renderSquareGrid(recentApps)
                            : <EmptyState>No recently launched apps. Open an app to see it here.</EmptyState>}
                    </section>
                )}
            </div>

            {/* Floating bottom tab bar; leaves room on the right for the chat bubble */}
            <nav className="fixed bottom-4 left-4 right-[88px] z-40 flex h-14 items-center justify-around rounded-full border border-white/80 bg-white/95 px-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95">
                {navItems.map(({ key, label, icon: Icon }) => {
                    const active = key === selectedView;
                    return (
                        <button
                            key={key}
                            type="button"
                            onClick={() => (key === "menu" ? onOpenMenu() : onSelectView(key))}
                            className={cn(
                                "flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
                                active ? "bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" : "text-muted-foreground"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", active && key === "favorites" && "fill-current")} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
}
