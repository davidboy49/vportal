"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { doc, onSnapshot } from "firebase/firestore";
import { Camera, ChevronsUpDown, LayoutGrid, LogOut, Moon, Search, Shield, Sun } from "lucide-react";
import { db } from "@/lib/firebase/client";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/avatar-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/*
 * Shared building blocks for the dashboard and admin sidebars so both read as
 * one product: a floating card, a Portal/Admin switch, pill-style nav rows and
 * an account menu in the footer.
 */

/** Rounded floating surface the sidebar content sits in. */
export function SidebarCard({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex h-full flex-col overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-sm",
                className
            )}
            {...props}
        />
    );
}

/** Portal name and logo; falls back to the defaults until settings load. */
export function usePortalBranding(initial?: { portalName?: string; logoUrl?: string }) {
    const [branding, setBranding] = React.useState(initial);
    React.useEffect(() => {
        if (initial || !db) return;
        return onSnapshot(
            doc(db, "settings", "global"),
            (snap) => setBranding(snap.data() as { portalName?: string; logoUrl?: string } | undefined),
            () => { /* not readable for this user: keep defaults */ }
        );
    }, [initial]);
    return {
        portalName: branding?.portalName || "VPortal",
        logoUrl: branding?.logoUrl || "/vportal_logo_v2.png",
    };
}

export function SidebarBrand({ portalName, logoUrl }: { portalName: string; logoUrl: string }) {
    return (
        <div className="flex items-center gap-2.5 px-2 py-1">
            <Image
                src={logoUrl}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 shrink-0 rounded-lg border border-sidebar-border/60 bg-white object-cover p-0.5"
            />
            <span className="truncate font-outfit text-base font-bold tracking-tight">{portalName}</span>
        </div>
    );
}

/** Portal / Admin segmented switch, shown to admins only. */
export function WorkspaceSwitch({ active, onNavigate }: { active: "portal" | "admin"; onNavigate?: () => void }) {
    const tabs = [
        { key: "portal" as const, href: "/", label: "Portal", icon: LayoutGrid },
        { key: "admin" as const, href: "/admin", label: "Admin", icon: Shield },
    ];
    return (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-sidebar-accent/60 p-1" role="tablist" aria-label="Workspace">
            {tabs.map(({ key, href, label, icon: Icon }) => {
                const isActive = key === active;
                return (
                    <Link
                        key={key}
                        href={href}
                        role="tab"
                        aria-selected={isActive}
                        onClick={onNavigate}
                        className={cn(
                            "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all",
                            isActive
                                ? "bg-sidebar text-sidebar-foreground shadow-sm ring-1 ring-sidebar-border"
                                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                        )}
                    >
                        <Icon className={cn("h-3.5 w-3.5", isActive && key === "admin" && "text-amber-500")} />
                        {label}
                    </Link>
                );
            })}
        </div>
    );
}

export function SidebarSearchButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="flex h-9 w-full items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar px-2.5 text-sm text-sidebar-foreground/50 transition-colors hover:border-sidebar-foreground/20 hover:text-sidebar-foreground/80"
        >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search apps</span>
            <kbd className="rounded border border-sidebar-border px-1.5 py-0.5 font-sans text-[10px] font-medium">Ctrl K</kbd>
        </button>
    );
}

export function SidebarSectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="select-none px-2.5 pb-1 pt-4 text-[11px] font-semibold text-sidebar-foreground/45">
            {children}
        </div>
    );
}

type NavItemProps = {
    label: string;
    active?: boolean;
    icon?: React.ComponentType<{ className?: string }>;
    /** Colored dot instead of an icon (categories). */
    dotColor?: string;
    count?: number;
    href?: string;
    onClick?: () => void;
} & Omit<React.ComponentProps<"button">, "onClick">;

/** One nav row: pill highlight when active, optional icon or dot and a count. */
export function SidebarNavItem({ label, active, icon: Icon, dotColor, count, href, onClick, className, ...rest }: NavItemProps) {
    const classes = cn(
        "group/nav flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-medium transition-colors select-none",
        active
            ? "bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        className
    );
    const content = (
        <>
            {Icon && <Icon className={cn("h-4 w-4 shrink-0", active ? "" : "text-sidebar-foreground/50 group-hover/nav:text-sidebar-foreground/80")} />}
            {dotColor && <span className="ml-1 mr-0.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />}
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {count !== undefined && (
                <span className={cn("text-xs tabular-nums", active ? "text-blue-700/70 dark:text-blue-300/70" : "text-sidebar-foreground/40")}>{count}</span>
            )}
        </>
    );
    if (href) {
        return (
            <Link href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={classes}>
                {content}
            </Link>
        );
    }
    return (
        <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={classes} {...rest}>
            {content}
        </button>
    );
}

/** Stable palette for category dots, picked by position. */
const CATEGORY_DOT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4", "#ef4444", "#84cc16"];
export function categoryDotColor(index: number) {
    return CATEGORY_DOT_COLORS[index % CATEGORY_DOT_COLORS.length];
}

function ThemeMenuItem() {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    return (
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setTheme(isDark ? "light" : "dark"); }}>
            {isDark ? <Sun className="text-amber-500" /> : <Moon className="text-sky-500" />}
            {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
    );
}

/** Footer account row; opens a menu with photo, theme, extra items and sign out. */
export function SidebarAccountMenu({
    name,
    role,
    avatarUrl,
    initials,
    onChangePhoto,
    onSignOut,
    children,
}: {
    name: string;
    role: string;
    avatarUrl: string | null;
    initials: string;
    onChangePhoto?: () => void;
    onSignOut: () => void;
    /** Extra menu items (Login PIN, seasonal effects, …). */
    children?: React.ReactNode;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
                >
                    <UserAvatar src={avatarUrl} initials={initials} size={32} className="border border-sidebar-border text-[11px]" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-tight">{name}</span>
                        <span className="block truncate text-xs leading-tight text-sidebar-foreground/50">{role}</span>
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" sideOffset={6} className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-1.5">
                <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{name} · {role}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {onChangePhoto && (
                    <DropdownMenuItem onSelect={onChangePhoto}>
                        <Camera /> Change profile picture
                    </DropdownMenuItem>
                )}
                <ThemeMenuItem />
                {children}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onSignOut}>
                    <LogOut /> Sign out
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
