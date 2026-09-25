"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { User } from "firebase/auth";
import { App, Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import { launchApp } from "@/lib/launch";
import { useToggleFavorite } from "@/hooks/use-toggle-favorite";
import { Camera, Check, ChevronRight, Clock, GripVertical, Heart, Home, LayoutGrid, Menu, Pencil, Search } from "lucide-react";
import { UserAvatar } from "@/components/avatar-dialog";

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
    avatarUrl: string | null;
    onOpenAvatar: () => void;
    onMoveApp: (fromId: string, toId: string) => void;
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
    editing = false,
    dragging = false,
    jiggleDelay = 0,
}: {
    app: App;
    user: User | null;
    isFavorite: boolean;
    onToggleFavorite: (id: string, isFav: boolean) => void;
    editing?: boolean;
    dragging?: boolean;
    jiggleDelay?: number;
}) {
    const { handleFavorite, loading } = useToggleFavorite(app, isFavorite, onToggleFavorite);

    return (
        <div className={cn("relative", editing && !dragging && "animate-jiggle")} style={editing ? { animationDelay: `${jiggleDelay}ms` } : undefined}>
            <button
                type="button"
                onClick={() => { if (!editing) launchApp(user, app); }}
                className={cn(
                    tileSurface,
                    "flex aspect-square w-full flex-col items-center justify-center gap-2 p-2 transition-transform",
                    editing ? "cursor-grab" : "active:scale-[0.97]",
                    dragging && "scale-110 border-blue-500/60 shadow-xl ring-2 ring-blue-500/50 dark:border-blue-400/60"
                )}
            >
                <AppIcon app={app} size={44} />
                <span className="line-clamp-2 text-center text-[13px] font-semibold leading-tight text-foreground">{app.name}</span>
            </button>
            {editing ? (
                <span className="pointer-events-none absolute right-2 top-2 text-muted-foreground/60">
                    <GripVertical className="h-4 w-4" />
                </span>
            ) : (
                <button
                    type="button"
                    onClick={handleFavorite}
                    disabled={loading}
                    aria-label={isFavorite ? `Remove ${app.name} from favorites` : `Add ${app.name} to favorites`}
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground/70"
                >
                    <Heart className={cn("h-4 w-4 transition-transform active:scale-75", isFavorite && "fill-current text-red-500")} />
                </button>
            )}
        </div>
    );
}

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;
const AUTOSCROLL_EDGE_PX = 110;

/**
 * Touch-friendly reorderable grid. HTML5 drag-and-drop doesn't fire on touch
 * screens, so this tracks pointer events directly: long-press a tile (or tap
 * "Edit") to enter edit mode, then drag; tiles swap live as the finger passes
 * over them.
 */
function SortableGrid({
    apps,
    editing,
    onStartEditing,
    onMove,
    renderTile,
}: {
    apps: App[];
    editing: boolean;
    onStartEditing: () => void;
    onMove: (fromId: string, toId: string) => void;
    renderTile: (app: App, state: { dragging: boolean; index: number }) => React.ReactNode;
}) {
    const [draggingId, setDraggingId] = useState<string | null>(null);
    const press = useRef<{ x: number; y: number; timer: number | null } | null>(null);
    const pointerY = useRef(0);
    const onMoveRef = useRef(onMove);
    useEffect(() => {
        onMoveRef.current = onMove;
    });

    const cancelPress = () => {
        if (press.current?.timer) window.clearTimeout(press.current.timer);
        press.current = null;
    };

    useEffect(() => cancelPress, []);

    // While dragging: follow the finger, swap with the tile under it, block
    // page scrolling, and auto-scroll near the top/bottom edges.
    useEffect(() => {
        if (!draggingId) return;

        const handleMove = (e: PointerEvent) => {
            pointerY.current = e.clientY;
            const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-sort-id]");
            const overId = over?.dataset.sortId;
            if (overId && overId !== draggingId) onMoveRef.current(draggingId, overId);
        };
        const handleUp = () => setDraggingId(null);
        const blockScroll = (e: TouchEvent) => e.preventDefault();

        let frame = 0;
        const autoScroll = () => {
            const y = pointerY.current;
            if (y && y < AUTOSCROLL_EDGE_PX) window.scrollBy(0, -8);
            else if (y && y > window.innerHeight - AUTOSCROLL_EDGE_PX) window.scrollBy(0, 8);
            frame = requestAnimationFrame(autoScroll);
        };
        frame = requestAnimationFrame(autoScroll);

        window.addEventListener("pointermove", handleMove);
        window.addEventListener("pointerup", handleUp);
        window.addEventListener("pointercancel", handleUp);
        window.addEventListener("touchmove", blockScroll, { passive: false });
        return () => {
            cancelAnimationFrame(frame);
            pointerY.current = 0;
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
            window.removeEventListener("pointercancel", handleUp);
            window.removeEventListener("touchmove", blockScroll);
        };
    }, [draggingId]);

    const handlePointerDown = (e: React.PointerEvent, appId: string) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        if (editing) {
            setDraggingId(appId);
            return;
        }
        cancelPress();
        press.current = {
            x: e.clientX,
            y: e.clientY,
            timer: window.setTimeout(() => {
                press.current = null;
                navigator.vibrate?.(15);
                onStartEditing();
                setDraggingId(appId);
            }, LONG_PRESS_MS),
        };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // Finger moved before the long-press fired: it's a scroll, not a press.
        if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > MOVE_TOLERANCE_PX) {
            cancelPress();
        }
    };

    return (
        <div className="grid grid-cols-3 gap-3">
            {apps.map((app, index) => (
                <div
                    key={app.id}
                    data-sort-id={app.id}
                    onPointerDown={(e) => handlePointerDown(e, app.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(e) => e.preventDefault()}
                    className={cn("select-none [-webkit-touch-callout:none]", editing && "touch-none", draggingId === app.id && "relative z-10")}
                >
                    {renderTile(app, { dragging: draggingId === app.id, index })}
                </div>
            ))}
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
    avatarUrl,
    onOpenAvatar,
    onMoveApp,
}: MobileHomeProps) {
    const [editing, setEditing] = useState(false);

    // Order is kept per category (the grid groups by category first), so only
    // allow swaps between apps of the same category.
    const handleMoveApp = (fromId: string, toId: string) => {
        const from = filteredApps.find(app => app.id === fromId);
        const to = filteredApps.find(app => app.id === toId);
        if (from && to && from.categoryId === to.categoryId) onMoveApp(fromId, toId);
    };

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

            {/* Greeting: avatar opens the picture picker, text opens PIN settings */}
            <div className="flex items-center gap-3 px-5 py-3">
                <button type="button" onClick={onOpenAvatar} aria-label="Change profile picture" className="relative shrink-0 active:scale-95">
                    <UserAvatar src={avatarUrl} initials={initials} size={56} className="border-2 border-white shadow-sm dark:border-white/10" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-white dark:border-zinc-900">
                        <Camera className="h-3 w-3" />
                    </span>
                </button>
                <button type="button" onClick={onOpenPin} className="min-w-0 text-left">
                    <span className="block truncate text-lg font-bold text-foreground font-outfit">Hello, {displayName}</span>
                    <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
                        {user?.isAnonymous ? "Guest Session" : isAdmin ? "Administrator" : "Profile & Login PIN"}
                        <ChevronRight className="h-4 w-4" />
                    </span>
                </button>
            </div>

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
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-lg font-bold text-foreground font-outfit">All Apps</h2>
                                {filteredApps.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => setEditing(e => !e)}
                                        className={cn(
                                            "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                                            editing ? "bg-blue-600 text-white shadow-md shadow-blue-600/25" : "text-blue-600 dark:text-blue-400"
                                        )}
                                    >
                                        {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                                        {editing ? "Done" : "Arrange"}
                                    </button>
                                )}
                            </div>
                            {editing && (
                                <p className="px-1 text-xs text-muted-foreground">Drag apps to reorder them. Tip: long-press any app to start arranging.</p>
                            )}
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
                                ? (
                                    <SortableGrid
                                        apps={filteredApps}
                                        editing={editing}
                                        onStartEditing={() => setEditing(true)}
                                        onMove={handleMoveApp}
                                        renderTile={(app, { dragging, index }) => (
                                            <SquareTile
                                                app={app}
                                                user={user}
                                                isFavorite={favorites.has(app.id)}
                                                onToggleFavorite={onToggleFavorite}
                                                editing={editing}
                                                dragging={dragging}
                                                jiggleDelay={(index % 3) * 90}
                                            />
                                        )}
                                    />
                                )
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
                            onClick={() => {
                                setEditing(false);
                                if (key === "menu") onOpenMenu();
                                else onSelectView(key);
                            }}
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
