"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { bootstrapAdmin } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { LayoutGrid, Compass, FolderOpen, Users, History, Settings, ArrowLeft, Menu, X, Loader2, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            if (!loading) {
                if (!user) {
                    router.push("/login");
                    return;
                }

                if (user.isAnonymous) {
                    console.log("Anonymous user detected in admin portal, redirecting...");
                    router.push("/");
                    return;
                }

                try {
                    // Try to get CACHED token result first to prevent network delay and layout flashing
                    let tokenResult = await user.getIdTokenResult(false);

                    // If not admin, try to bootstrap admin (if matches ADMIN_EMAIL) and force refresh
                    if (tokenResult.claims.role !== "ADMIN") {
                        const token = await user.getIdToken();
                        await bootstrapAdmin(token);
                        tokenResult = await user.getIdTokenResult(true); // force refresh once
                    }

                    if (tokenResult.claims.role === "ADMIN") {
                        setIsAdmin(true);
                    } else {
                        console.log("User does NOT have admin role. Claims:", tokenResult.claims);
                        router.push("/"); // Not admin, redirect to dashboard
                    }
                } catch (error) {
                    console.error("Error checking admin role:", error);
                    router.push("/");
                } finally {
                    setChecking(false);
                }
            }
        };

        checkRole();
    }, [user, loading, router]);

    if (loading || checking) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-foreground transition-colors duration-500">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="animate-spin text-blue-600 dark:text-blue-500 h-8 w-8" />
                    <span className="text-xs font-bold text-muted-foreground font-outfit uppercase tracking-wider">Verifying Admin Access...</span>
                </div>
            </div>
        );
    }

    if (!isAdmin) return null;

    const renderSidebarContent = () => {
        const navLinks = [
            { href: "/admin", label: "Overview", icon: LayoutGrid },
            { href: "/admin/apps", label: "Manage Apps", icon: Compass },
            { href: "/admin/categories", label: "Categories", icon: FolderOpen },
            { href: "/admin/users", label: "Users", icon: Users },
            { href: "/admin/changelog", label: "Change Logs", icon: History },
            { href: "/admin/settings", label: "Portal Settings", icon: Settings },
        ];

        return (
            <div className="flex flex-col h-full text-card-foreground">
                {/* Brand / Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-black/5 dark:border-white/5 shrink-0">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-500 shrink-0" />
                    <span className="text-xl font-black tracking-tight text-foreground font-outfit select-none">
                        Admin Portal
                    </span>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileSidebarOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                                    isActive
                                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 font-semibold"
                                        : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 hover:text-foreground border border-transparent"
                                )}
                            >
                                <Icon className="w-4.5 h-4.5 shrink-0" />
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom Profile / User Panel */}
                <div className="p-4 border-t border-black/5 dark:border-white/5 space-y-3 shrink-0">
                    <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-blue-500/10">
                                AD
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold truncate text-foreground/90 leading-tight">
                                    {user?.displayName || user?.email?.split("@")[0]}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                    Portal Admin
                                </span>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm"
                        asChild
                        className="w-full flex items-center justify-center gap-2 border border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 text-xs py-2 transition-all duration-300 rounded-lg font-medium"
                    >
                        <Link href="/">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Exit to Dashboard</span>
                        </Link>
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Desktop Sidebar (Left Panel) */}
            <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-black/5 dark:border-white/5 h-screen sticky top-0 z-20 shrink-0">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Sidebar (Collapsible Drawer Overlay) */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-300">
                    {/* Backdrop click close */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
                    
                    {/* Sidebar Drawer panel */}
                    <aside className="relative w-64 glass-panel border-r border-black/5 dark:border-white/5 h-full flex flex-col p-0 text-card-foreground shadow-2xl animate-in slide-in-from-left duration-300">
                        {/* Close button inside panel */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
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
                <header className="glass-panel py-3 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 sticky top-0 z-10 w-full backdrop-blur-md shrink-0">
                    <div className="flex items-center">
                        {/* Hamburger mobile toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-9 w-9 text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg mr-2"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        
                        {/* Breadcrumbs pathway */}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none font-outfit uppercase tracking-wider">
                            <span>Admin</span>
                            <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-foreground">
                                {pathname === "/admin" ? "Overview" : pathname.replace("/admin/", "").replace("-", " ")}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Dashboard grid panel wrapper */}
                <div className="p-6 space-y-6 max-w-7xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}
