"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { App, Category } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, LayoutGrid, Heart, Clock, Shield, Settings, LogOut, Menu, X, Compass, Lock } from "lucide-react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { checkUserPinStatus, setUserPin, removeUserPin } from "@/actions/pin";
import { CommandPalette } from "@/components/command-palette";

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

    // Sidebar Layout States
    const [selectedView, setSelectedView] = useState<"dashboard" | "favorites" | "recent">("dashboard");
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Command Palette (Ctrl/Cmd+K)
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

    // PIN Settings Dialog States
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
    const [pinEnabled, setPinEnabled] = useState(false);
    const [newPin, setNewPin] = useState("");
    const [confirmPin, setConfirmPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinSuccess, setPinSuccess] = useState("");
    const [pinLoading, setPinLoading] = useState(false);
    const [removePinConfirm, setRemovePinConfirm] = useState(false);

    const handleToggleFavorite = useCallback((id: string, isFav: boolean) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (isFav) next.add(id); else next.delete(id);
            return next;
        });
    }, []);

    // Global Ctrl/Cmd+K shortcut to open the command palette
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setCommandPaletteOpen((open) => !open);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Sync user details and PIN status to LocalStorage
    useEffect(() => {
        if (!user) return;
        
        const syncLastUser = async () => {
            try {
                const pinStatus = await checkUserPinStatus(user.uid);
                const lastUser = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    pinEnabled: pinStatus.pinEnabled
                };
                window.localStorage.setItem("vportal-last-user", JSON.stringify(lastUser));
            } catch (err) {
                console.error("Error syncing last user info to localStorage:", err);
            }
        };

        syncLastUser();
    }, [user]);

    // Fetch PIN status on dialog open
    useEffect(() => {
        if (isPinDialogOpen && user) {
            setPinError("");
            setPinSuccess("");
            setNewPin("");
            setConfirmPin("");
            checkUserPinStatus(user.uid).then((res) => {
                if (res.success) {
                    setPinEnabled(res.pinEnabled);
                }
            });
        }
    }, [isPinDialogOpen, user]);

    const handleSetPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError("");
        setPinSuccess("");
        
        if (!user) return;
        if (!/^\d{4}$/.test(newPin)) {
            setPinError("PIN must be exactly 4 digits");
            return;
        }
        if (newPin !== confirmPin) {
            setPinError("PINs do not match");
            return;
        }

        setPinLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await setUserPin(token, newPin);
            if (res.success) {
                setPinSuccess("PIN set successfully!");
                setPinEnabled(true);
                setNewPin("");
                setConfirmPin("");
                
                // Update LocalStorage info
                const stored = window.localStorage.getItem("vportal-last-user");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.pinEnabled = true;
                    window.localStorage.setItem("vportal-last-user", JSON.stringify(parsed));
                }
            } else {
                setPinError(res.message || "Failed to set PIN");
            }
        } catch (err) {
            setPinError("An error occurred. Please try again.");
            console.error(err);
        } finally {
            setPinLoading(false);
        }
    };

    const handleRemovePin = async () => {
        setPinError("");
        setPinSuccess("");
        if (!user) return;
        setRemovePinConfirm(true);
    };

    const handleRemovePinConfirmed = async () => {
        setRemovePinConfirm(false);
        if (!user) return;

        setPinLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await removeUserPin(token);
            if (res.success) {
                setPinSuccess("PIN removed successfully.");
                setPinEnabled(false);
                setNewPin("");
                setConfirmPin("");

                // Update LocalStorage info
                const stored = window.localStorage.getItem("vportal-last-user");
                if (stored) {
                    const parsed = JSON.parse(stored);
                    parsed.pinEnabled = false;
                    window.localStorage.setItem("vportal-last-user", JSON.stringify(parsed));
                }
            } else {
                setPinError(res.message || "Failed to remove PIN");
            }
        } catch (err) {
            setPinError("An error occurred. Please try again.");
            console.error(err);
        } finally {
            setPinLoading(false);
        }
    };

    // Admin-only apps/categories are hidden from regular users here, mirroring
    // how isActive is already filtered - a display-layer curation, not a hard
    // Firestore-rules boundary (consistent with the rest of this app's model).
    const visibleApps = useMemo(
        () => apps.filter((app) => isAdmin || app.visibility !== "ADMIN_ONLY"),
        [apps, isAdmin]
    );
    const visibleCategories = useMemo(
        () => categories.filter((category) => isAdmin || category.visibility !== "ADMIN_ONLY"),
        [categories, isAdmin]
    );

    const orderedCategories = useMemo(() => {
        const categoriesById = new Map(visibleCategories.map((category) => [category.id, category]));
        const defaultOrder = [...visibleCategories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id);
        const orderIds = mounted && categoryOrderIds.length > 0 ? categoryOrderIds : defaultOrder;
        const preferredCategories = orderIds
            .map((categoryId) => categoriesById.get(categoryId))
            .filter((category): category is Category => Boolean(category));
        const missingCategories = visibleCategories.filter((category) => !orderIds.includes(category.id));

        return [...preferredCategories, ...missingCategories];
    }, [visibleCategories, categoryOrderIds, mounted]);

    // Determine admin status, then bootstrap/reconcile in the background.
    useEffect(() => {
        if (!user) {
            setIsAdmin(false);
            return;
        }

        let cancelled = false;

        // Fast path: read whatever role claim is already on the cached ID
        // token (no network round trip in the common case) so admin-only
        // nav/apps don't stay hidden while the slower bootstrap call runs.
        user.getIdTokenResult()
            .then((tokenResult) => {
                if (!cancelled) setIsAdmin(tokenResult.claims.role === "ADMIN");
            })
            .catch(() => {
                if (!cancelled) setIsAdmin(false);
            });

        // Background reconciliation: bootstraps the designated admin email
        // and force-refreshes claims in case a role change hasn't propagated
        // to the cached token yet. Runs independently of the fast path above
        // so a bootstrap failure (network blip, cold start, etc.) can't wipe
        // out an already-known-good admin status.
        (async () => {
            try {
                const token = await user.getIdToken();
                await bootstrapAdmin(token);
                const refreshed = await user.getIdTokenResult(true);
                if (!cancelled) setIsAdmin(refreshed.claims.role === "ADMIN");
            } catch {
                // Fast-path result (if any) stands.
            }
        })();

        return () => { cancelled = true; };
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
            const isGuest = user.isAnonymous || user.email === "guest@vportal.com";
            if (isGuest) {
                try {
                    const storedFavs = localStorage.getItem("vportal_guest_favorites") || "[]";
                    setFavorites(new Set(JSON.parse(storedFavs)));
                } catch (e) {
                    setFavorites(new Set());
                }
                try {
                    const storedRecents = localStorage.getItem("vportal_guest_recent") || "[]";
                    setRecent(JSON.parse(storedRecents));
                } catch (e) {
                    setRecent([]);
                }
                return;
            }

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

        const handleGuestUpdate = () => {
            fetchUserData();
        };
        window.addEventListener("vportal_guest_data_updated", handleGuestUpdate);

        return () => {
            unsubscribeApps();
            unsubscribeCategories();
            window.removeEventListener("vportal_guest_data_updated", handleGuestUpdate);
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
        setCategoryOrderIds([...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((c) => c.id));
    }, [categories, initialCategories]);

    const filteredApps = useMemo(() => {
        const categoryOrder = new Map(orderedCategories.map((category, index) => [category.id, index]));

        return visibleApps
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
    }, [visibleApps, orderedCategories, search, selectedCategory]);

    const recentApps = useMemo(() => {
        const recentOrder = new Map(recent.map((appId, index) => [appId, index]));

        return visibleApps
            .filter((app) => recentOrder.has(app.id))
            .sort((a, b) => (recentOrder.get(a.id) ?? 0) - (recentOrder.get(b.id) ?? 0));
    }, [visibleApps, recent]);

    const favoriteApps = useMemo(() => {
        return visibleApps.filter(app => favorites.has(app.id));
    }, [visibleApps, favorites]);

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        visibleApps.forEach(app => {
            if (app.categoryId) {
                counts[app.categoryId] = (counts[app.categoryId] || 0) + 1;
            }
        });
        return counts;
    }, [visibleApps]);

    const moveCategory = (fromCategoryId: string, toCategoryId: string) => {
        if (fromCategoryId === toCategoryId) return;

        setCategoryOrderIds((current) => {
            const categoryIds = new Set(visibleCategories.map((category) => category.id));
            const currentOrder = current.filter((id) => categoryIds.has(id));
            const missingIds = visibleCategories.map((category) => category.id).filter((id) => !currentOrder.includes(id));
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
                    <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                        <div className="relative flex h-16 w-16 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400/20 animate-ping" />
                            <Image
                                src={globalSettings?.logoUrl || "/vportal_logo_v2.png"}
                                alt="VPortal"
                                width={40}
                                height={40}
                                unoptimized
                                className="relative z-10 w-10 h-10 rounded-lg object-cover border border-black/5 dark:border-white/5"
                            />
                        </div>
                        <div className="text-center space-y-1">
                            <p className="text-sm font-bold text-foreground/80 font-outfit tracking-wide">
                                {globalSettings?.portalName || "VPortal"}
                            </p>
                            <p className="text-xs text-muted-foreground">Loading your workspace...</p>
                        </div>
                        <div className="flex gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-bounce" />
                        </div>
                    </div>
                )}
            </div>
        );
    }

    const renderSidebarContent = () => {
        return (
            <div className="flex flex-col h-full text-sidebar-foreground">
                {/* Brand / Logo */}
                <div className="flex h-14 items-center gap-3 px-6 border-b border-sidebar-border shrink-0">
                    <Image
                        src={globalSettings?.logoUrl || "/vportal_logo_v2.png"}
                        alt={globalSettings?.portalName || "VPortal Logo"}
                        width={28}
                        height={28}
                        unoptimized
                        className="w-7 h-7 rounded-md object-cover border border-sidebar-border/30 p-0.5 bg-sidebar-accent/50"
                    />
                    <span className="text-base font-bold tracking-tight text-sidebar-foreground font-outfit select-none">
                        {globalSettings?.portalName || "VPortal"}
                    </span>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
                    {/* Views Section */}
                    <div className="space-y-1">
                        <span className="px-3 text-[10px] font-semibold tracking-wider uppercase text-sidebar-foreground/45 block mb-1.5 select-none">Views</span>
                        
                        <button
                            onClick={() => {
                                setSelectedView("dashboard");
                                setSelectedCategory(null);
                                setMobileSidebarOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                selectedView === "dashboard" && !selectedCategory
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/10 font-semibold"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border border-transparent"
                            )}
                        >
                            <LayoutGrid className="w-4 h-4 shrink-0" />
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedView("favorites");
                                setSelectedCategory(null);
                                setMobileSidebarOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                selectedView === "favorites"
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/10 font-semibold"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border border-transparent"
                            )}
                        >
                            <Heart className="w-4 h-4 shrink-0" />
                            <span>Favorites</span>
                        </button>

                        <button
                            onClick={() => {
                                setSelectedView("recent");
                                setSelectedCategory(null);
                                setMobileSidebarOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200",
                                selectedView === "recent"
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/10 font-semibold"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border border-transparent"
                            )}
                        >
                            <Clock className="w-4 h-4 shrink-0" />
                            <span>Recents</span>
                        </button>
                    </div>

                    {/* Categories Section */}
                    <div className="space-y-1">
                        <span className="px-3 text-[10px] font-semibold tracking-wider uppercase text-sidebar-foreground/45 block mb-1.5 select-none">Categories</span>
                        
                        <button
                            onClick={() => {
                                setSelectedCategory(null);
                                setMobileSidebarOpen(false);
                            }}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 group",
                                selectedCategory === null && selectedView === "dashboard"
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/10 font-semibold"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border border-transparent"
                            )}
                        >
                            <Compass className="w-4 h-4 shrink-0" />
                            <span className="flex-1 truncate text-left">All Categories</span>
                            <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                selectedCategory === null && selectedView === "dashboard"
                                    ? "bg-sidebar-background text-sidebar-accent-foreground"
                                    : "bg-sidebar-accent/40 text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                            )}>
                                {visibleApps.length}
                            </span>
                        </button>

                        {orderedCategories.map(cat => {
                            const count = categoryCounts[cat.id] || 0;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setSelectedView("dashboard");
                                        setMobileSidebarOpen(false);
                                    }}
                                    draggable
                                    onDragStart={() => setDraggingCategoryId(cat.id)}
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={() => {
                                        if (!draggingCategoryId) return;
                                        moveCategory(draggingCategoryId, cat.id);
                                        setDraggingCategoryId(null);
                                    }}
                                    onDragEnd={() => setDraggingCategoryId(null)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 select-none text-left group",
                                        isActive
                                            ? "bg-sidebar-accent text-sidebar-accent-foreground border border-sidebar-border/10 font-semibold"
                                            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground border border-transparent"
                                    )}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
                                    <span className="truncate flex-1">{cat.name}</span>
                                    <span className={cn(
                                        "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                        isActive
                                            ? "bg-sidebar-background text-sidebar-accent-foreground"
                                            : "bg-sidebar-accent/40 text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div className="space-y-1">
                            <span className="px-3 text-[10px] font-semibold tracking-wider uppercase text-sidebar-foreground/45 block mb-1.5 select-none">Admin</span>
                            <Link
                                href="/admin"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
                                onClick={() => setMobileSidebarOpen(false)}
                            >
                                <Shield className="w-4 h-4 shrink-0" />
                                <span>Admin Portal</span>
                            </Link>
                            <Link
                                href="/admin/settings"
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
                                onClick={() => setMobileSidebarOpen(false)}
                            >
                                <Settings className="w-4 h-4 shrink-0" />
                                <span>Portal Settings</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Bottom Profile / User Panel */}
                <div className="p-3 border-t border-sidebar-border space-y-2 shrink-0">
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/40">
                        <div className="flex items-center gap-2 min-w-0">
                            {user?.photoURL ? (
                                <Image
                                    src={user.photoURL}
                                    alt="User Avatar"
                                    width={28}
                                    height={28}
                                    unoptimized
                                    className="w-7 h-7 rounded-full border border-sidebar-border/50 object-cover"
                                />
                            ) : (
                                <div className="w-7 h-7 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-sidebar-border/30">
                                    {user?.email ? user.email.slice(0, 2) : "U"}
                                </div>
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold truncate text-sidebar-foreground leading-tight">
                                    {user?.displayName || (user?.isAnonymous ? "Guest" : user?.email?.split("@")[0])}
                                </span>
                                <span className="text-[9px] text-sidebar-foreground/50 truncate leading-tight mt-0.5">
                                    {user?.isAnonymous ? "Guest Session" : (isAdmin ? "Administrator" : "Standard User")}
                                </span>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setIsPinDialogOpen(true)} 
                        className="w-full flex items-center justify-center gap-2 border border-sidebar-border/40 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-xs py-1.5 h-8 transition-all rounded-md"
                    >
                        <Lock className="w-3.5 h-3.5 text-sidebar-foreground/60" />
                        <span className="text-sidebar-foreground/80">Login PIN</span>
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => signOut()} 
                        className="w-full flex items-center justify-center gap-2 border border-sidebar-border/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 text-xs py-1.5 h-8 transition-all rounded-md"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex w-full bg-background text-foreground">
            {/* Desktop Sidebar (Left Panel) */}
            <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 z-20 shrink-0">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Sidebar (Collapsible Drawer Overlay) */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-300">
                    {/* Backdrop click close */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
                    
                    {/* Sidebar Drawer panel */}
                    <aside className="relative w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-full flex flex-col p-0 shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Close button inside panel */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 rounded-lg hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            onClick={() => setMobileSidebarOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        {renderSidebarContent()}
                    </aside>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top Nav Header */}
                <header className="bg-background/95 backdrop-blur border-b border-border py-3 px-6 flex items-center justify-between sticky top-0 z-10 w-full shrink-0">
                    <div className="flex items-center">
                        {/* Hamburger mobile toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-9 w-9 text-foreground hover:bg-muted rounded-lg mr-2"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        
                        {/* Breadcrumbs pathway */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none font-outfit uppercase tracking-wider">
                            <span>Portal</span>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-foreground">{selectedCategory ? visibleCategories.find(c => c.id === selectedCategory)?.name : selectedView}</span>
                        </div>
                    </div>

                    {/* Search bar input block */}
                    <div className="relative w-full max-w-sm md:max-w-md group">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                            type="search"
                            placeholder="Search apps..."
                            className="pl-9 pr-14 h-9 bg-muted/40 border-input focus:bg-background focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-300 rounded-lg shadow-sm w-full"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            className="hidden sm:flex absolute right-2 top-1.5 h-6 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors select-none"
                            title="Quick launch (Ctrl/Cmd+K)"
                        >
                            <span>Ctrl</span>K
                        </button>
                    </div>
                </header>

                {/* Dashboard grid panel wrapper */}
                <div className="p-6 space-y-8 max-w-7xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
                    
                    {/* Welcome Banner Hero Block (shadcn style) */}
                    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8 shadow-sm">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="space-y-2 max-w-2xl">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary select-none">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
                                    </span>
                                    <span>System Active</span>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-outfit">
                                    Welcome back, {user?.displayName || (user?.isAnonymous ? "Guest User" : user?.email?.split("@")[0])}
                                </h1>
                                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                                    Access all company applications, tools, and portals from your centralized workspace. Use Quick PIN settings to configure instant logins.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 select-none">
                                {/* Quick status cards - minimalist shadcn border style */}
                                <div className="flex flex-col gap-0.5 border border-border bg-muted/40 rounded-lg px-4 py-3 min-w-[110px] text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total Apps</span>
                                    <span className="text-2xl font-bold font-outfit text-foreground">{visibleApps.length}</span>
                                </div>
                                <div className="flex flex-col gap-0.5 border border-border bg-muted/40 rounded-lg px-4 py-3 min-w-[110px] text-center">
                                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Favorites</span>
                                    <span className="text-2xl font-bold font-outfit text-foreground">{favorites.size}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Category Chips Row */}
                    <div className="flex md:hidden overflow-x-auto gap-2 pb-2 custom-scrollbar shrink-0 select-none">
                        <Badge
                            variant={selectedCategory === null ? "default" : "outline"}
                            className={cn(
                                "cursor-pointer px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap",
                                selectedCategory === null 
                                    ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                                    : "bg-white/40 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                            )}
                            onClick={() => { setSelectedCategory(null); setSelectedView("dashboard"); }}
                        >
                            All Categories ({visibleApps.length})
                        </Badge>
                        {orderedCategories.map(cat => {
                            const count = categoryCounts[cat.id] || 0;
                            return (
                                <Badge
                                    key={cat.id}
                                    variant={selectedCategory === cat.id ? "default" : "outline"}
                                    className={cn(
                                        "cursor-pointer px-3 py-1 text-xs font-semibold rounded-full transition-all duration-300 whitespace-nowrap",
                                        selectedCategory === cat.id 
                                            ? "bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-500/20" 
                                            : "bg-white/40 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-foreground"
                                    )}
                                    onClick={() => { setSelectedCategory(cat.id); setSelectedView("dashboard"); }}
                                >
                                    {cat.name} ({count})
                                </Badge>
                            );
                        })}
                    </div>

                    {/* Active View Router */}
                    {selectedView === "favorites" && (
                        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground/90 font-outfit">Favorites</h2>
                                <p className="text-xs text-muted-foreground">Your pinned applications for quick access.</p>
                            </div>
                            {favoriteApps.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {favoriteApps.map(app => (
                                        <AppCard key={app.id} app={app} isFavorite={true} onToggleFavorite={handleToggleFavorite} />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground py-12 text-center glass-panel rounded-xl border-dashed">You haven't added any favorites yet. Click the heart icon on any app to pin it here.</p>
                            )}
                        </section>
                    )}

                    {selectedView === "recent" && (
                        <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground/90 font-outfit">Recently Opened</h2>
                                <p className="text-xs text-muted-foreground">The last 10 applications you launched.</p>
                            </div>
                            {recentApps.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                    {recentApps.map(app => (
                                        <AppCard
                                            key={app.id}
                                            app={app}
                                            isFavorite={favorites.has(app.id)}
                                            onToggleFavorite={handleToggleFavorite}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <p className="text-muted-foreground py-12 text-center glass-panel rounded-xl border-dashed">No recently launched apps found. Launch an app to see it here.</p>
                            )}
                        </section>
                    )}

                    {selectedView === "dashboard" && (
                        <div className="space-y-8">
                            {/* Selected Category View vs Full Dashboard */}
                            {selectedCategory ? (
                                <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col gap-1">
                                        <h2 className="text-2xl font-bold tracking-tight text-foreground/90 font-outfit">
                                            {visibleCategories.find(c => c.id === selectedCategory)?.name}
                                        </h2>
                                        <p className="text-xs text-muted-foreground">Applications under this category.</p>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                        {filteredApps.map(app => (
                                            <AppCard
                                                key={app.id}
                                                app={app}
                                                isFavorite={favorites.has(app.id)}
                                                onToggleFavorite={handleToggleFavorite}
                                            />
                                        ))}
                                        {filteredApps.length === 0 && (
                                            <p className="text-muted-foreground col-span-full py-12 text-center glass-panel rounded-xl border-dashed">No apps found matching your criteria in this category.</p>
                                        )}
                                    </div>
                                </section>
                            ) : (
                                <>
                                    {/* Favorites Subsection */}
                                    {favoriteApps.length > 0 && (
                                        <section className="space-y-4">
                                            <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">Favorites</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {favoriteApps.map(app => (
                                                    <AppCard key={app.id} app={app} isFavorite={true} onToggleFavorite={handleToggleFavorite} />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Recent Subsection */}
                                    {recentApps.length > 0 && (
                                        <section className="space-y-4">
                                            <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">Recent</h2>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                                {recentApps.map(app => (
                                                    <AppCard
                                                        key={app.id}
                                                        app={app}
                                                        isFavorite={favorites.has(app.id)}
                                                        onToggleFavorite={handleToggleFavorite}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* All Apps Subsection */}
                                    <section className="space-y-4">
                                        <h2 className="text-xl font-bold tracking-tight text-foreground/90 font-outfit">All Apps</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {filteredApps.map(app => (
                                                <AppCard
                                                    key={app.id}
                                                    app={app}
                                                    isFavorite={favorites.has(app.id)}
                                                    onToggleFavorite={handleToggleFavorite}
                                                />
                                            ))}
                                            {filteredApps.length === 0 && (
                                                <p className="text-muted-foreground col-span-full py-12 text-center glass-panel rounded-xl border-dashed">No apps found matching your search criteria.</p>
                                            )}
                                        </div>
                                    </section>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* PIN Settings Dialog */}
            <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                <DialogContent className="sm:max-w-md glass-panel border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl overflow-hidden p-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-bold tracking-tight text-foreground/90 font-outfit flex items-center gap-2">
                            <Lock className="w-5 h-5 text-blue-500" />
                            <span>Quick Login PIN Settings</span>
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {pinEnabled 
                                ? "Configure or disable your 4-digit passcode for quick sign-in from this device." 
                                : "Create a 4-digit passcode to sign back in quickly next time without using Google login."}
                        </DialogDescription>
                    </DialogHeader>

                    {pinEnabled && (
                        <div className="p-3 mb-2 text-xs rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400">
                            PIN Quick Login is currently <strong>enabled</strong> on this device.
                        </div>
                    )}

                    <form onSubmit={handleSetPin} className="space-y-4 pt-2">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="new-pin" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    {pinEnabled ? "New 4-Digit PIN" : "4-Digit PIN"}
                                </Label>
                                <Input
                                    id="new-pin"
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={newPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        if (val.length <= 4) setNewPin(val);
                                    }}
                                    className="text-center text-lg tracking-[1.5em] font-mono h-11 bg-background/50 border-black/10 dark:border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-lg text-foreground"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="confirm-pin" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Confirm PIN
                                </Label>
                                <Input
                                    id="confirm-pin"
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={4}
                                    placeholder="••••"
                                    value={confirmPin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        if (val.length <= 4) setConfirmPin(val);
                                    }}
                                    className="text-center text-lg tracking-[1.5em] font-mono h-11 bg-background/50 border-black/10 dark:border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 rounded-lg text-foreground"
                                    required
                                />
                            </div>
                        </div>

                        {pinError && <p className="text-xs text-destructive text-center font-medium animate-bounce">{pinError}</p>}
                        {pinSuccess && <p className="text-xs text-green-500 text-center font-medium">{pinSuccess}</p>}

                        <div className="flex flex-col gap-2 pt-2">
                            <Button type="submit" disabled={pinLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 shadow-lg shadow-blue-500/20 rounded-lg">
                                {pinLoading ? "Saving..." : (pinEnabled ? "Update PIN" : "Enable PIN")}
                            </Button>
                            
                            {pinEnabled && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={handleRemovePin} 
                                    disabled={pinLoading} 
                                    className="w-full border-destructive/20 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 text-xs py-2 rounded-lg"
                                >
                                    Disable & Remove PIN
                                </Button>
                            )}
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <CommandPalette apps={visibleApps} open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
        </div>
    );
}


