"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { bootstrapAdmin } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { 
    LayoutGrid, 
    Compass, 
    FolderOpen, 
    Users, 
    History, 
    Settings, 
    ArrowLeft, 
    Menu, 
    X, 
    Loader2, 
    Shield, 
    Search, 
    Star, 
    Briefcase, 
    Calendar, 
    BarChart3, 
    Sliders,
    Grid,
    Bell,
    ChevronDown,
    LogOut
} from "lucide-react";
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
        const sections = [
            {
                title: "DASHBOARD",
                links: [
                    { href: "/admin", label: "Overview", icon: LayoutGrid },
                    { href: "/admin/settings", label: "Portal Settings", icon: Settings },
                ]
            },
            {
                title: "PROJECTS",
                links: [
                    { href: "/admin/apps", label: "Manage Apps", icon: Compass },
                    { href: "/admin/categories", label: "Categories", icon: FolderOpen },
                ]
            },
            {
                title: "CUSTOMERS",
                links: [
                    { href: "/admin/users", label: "Users", icon: Users },
                    { href: "/admin/changelog", label: "Change Logs", icon: History },
                ]
            }
        ];

        return (
            <div className="flex flex-col h-full text-white">
                {/* Brand / Logo */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 h-16 bg-[#162a4a]">
                    <div className="flex items-center gap-2">
                        {/* Logo styling matching user mockup */}
                        <div className="bg-white text-[#162a4a] px-4 py-1 rounded font-black tracking-widest text-sm shadow-sm select-none">
                            LOGO
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                {/* Navigation Links grouped by sections */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6 custom-scrollbar bg-[#1a3154]">
                    {sections.map((section) => (
                        <div key={section.title} className="space-y-1.5">
                            {/* Section Header */}
                            <h3 className="text-[10px] font-black tracking-wider text-blue-200/40 px-3 uppercase select-none">
                                {section.title}
                            </h3>
                            {/* Section Items */}
                            <div className="space-y-1">
                                {section.links.map((link) => {
                                    const Icon = link.icon;
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileSidebarOpen(false)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200",
                                                isActive
                                                    ? "bg-[#162a4a] text-white shadow-sm border-l-4 border-blue-400 pl-2"
                                                    : "text-blue-100/60 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            <span>{link.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom Exit Panel */}
                <div className="p-4 border-t border-white/10 shrink-0 bg-[#162a4a]">
                    <Button 
                        variant="ghost" 
                        size="sm"
                        asChild
                        className="w-full flex items-center justify-center gap-2 text-white hover:bg-white/5 hover:text-white text-xs py-2 rounded-lg font-medium border border-white/10"
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
        <div className="min-h-screen flex w-full overflow-hidden bg-[#f5f7fb] dark:bg-[#0b1329]">
            {/* Desktop Sidebar (Left Panel) */}
            <aside className="hidden md:flex flex-col w-64 border-r border-white/10 h-screen sticky top-0 z-20 shrink-0 shadow-lg bg-[#1a3154]">
                {renderSidebarContent()}
            </aside>

            {/* Mobile Sidebar (Collapsible Drawer Overlay) */}
            {mobileSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
                    <aside className="relative w-64 border-r border-white/10 h-full flex flex-col p-0 shadow-2xl animate-in slide-in-from-left duration-300 bg-[#1a3154]">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 rounded-lg text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setMobileSidebarOpen(false)}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                        {renderSidebarContent()}
                    </aside>
                </div>
            )}

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-screen">
                {/* Top Nav Header - Dark Corporate Style */}
                <header className="bg-[#1c355e] text-white py-3 px-6 flex items-center justify-between sticky top-0 z-10 w-full h-16 shadow-md shrink-0">
                    <div className="flex items-center gap-6">
                        {/* Hamburger mobile toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-9 w-9 text-white hover:bg-white/10 rounded-lg mr-2"
                            onClick={() => setMobileSidebarOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        
                        {/* Search Bar Icon Trigger */}
                        <div className="relative hidden lg:flex items-center text-blue-200/50 hover:text-white transition-colors duration-200 cursor-pointer">
                            <Search className="w-4 h-4 mr-2" />
                            <span className="text-xs font-semibold">Search menu...</span>
                        </div>

                        {/* Top Bar Horizontal Menu Links */}
                        <nav className="hidden md:flex items-center gap-5 text-[11px] font-semibold text-blue-200/70 select-none">
                            <Link href="/admin" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                <span>Favorite</span>
                            </Link>
                            <Link href="/admin/apps" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                                <Briefcase className="w-3.5 h-3.5" />
                                <span>Loan</span>
                            </Link>
                            <Link href="/admin/changelog" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Reports</span>
                            </Link>
                            <Link href="/admin" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                                <BarChart3 className="w-3.5 h-3.5" />
                                <span>PowerBI</span>
                            </Link>
                            <Link href="/admin/settings" className="flex items-center gap-1.5 hover:text-white transition-colors duration-200">
                                <Sliders className="w-3.5 h-3.5" />
                                <span>Configure</span>
                                <ChevronDown className="w-3 h-3 text-blue-200/40" />
                            </Link>
                        </nav>
                    </div>

                    {/* Right Toolbar Actions */}
                    <div className="flex items-center gap-4">
                        {/* Quick Grid Selector Icon */}
                        <Button variant="ghost" size="icon" className="hidden sm:flex text-blue-200/70 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
                            <Grid className="w-4 h-4" />
                        </Button>

                        {/* Notification Bell */}
                        <Button variant="ghost" size="icon" className="relative text-blue-200/70 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#1c355e]" />
                        </Button>

                        {/* Settings Button */}
                        <Button variant="ghost" size="icon" asChild className="hidden sm:flex text-blue-200/70 hover:text-white hover:bg-white/10 rounded-full h-8 w-8">
                            <Link href="/admin/settings">
                                <Settings className="w-4 h-4" />
                            </Link>
                        </Button>

                        {/* Divider Line */}
                        <div className="h-6 w-[1px] bg-white/15 hidden sm:block" />

                        {/* User Profile Block */}
                        <div className="flex items-center gap-3 select-none">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-white flex items-center justify-center font-bold text-xs uppercase border border-blue-400/20 shadow-inner">
                                {user?.displayName ? user.displayName.slice(0, 2) : "AD"}
                            </div>
                            <div className="hidden sm:flex flex-col text-left">
                                <span className="text-xs font-bold leading-tight">
                                    {user?.displayName || user?.email?.split("@")[0]}
                                </span>
                                <span className="text-[10px] text-blue-200/50 leading-tight">
                                    Administrator
                                </span>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-blue-200/40 hidden sm:block" />
                        </div>
                    </div>
                </header>

                {/* Dashboard Canvas Wrapper */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl w-full mx-auto custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}
