"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Shield,
  ArrowLeft,
  LayoutGrid,
  Compass,
  FolderOpen,
  Users,
  History,
  Settings,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: "/admin", label: "Overview", icon: LayoutGrid },
    { href: "/admin/apps", label: "Manage Apps", icon: Compass },
    { href: "/admin/categories", label: "Categories", icon: FolderOpen },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/changelog", label: "Change Logs", icon: History },
    { href: "/admin/settings", label: "Portal Settings", icon: Settings },
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b border-sidebar-border py-4 px-4">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-500 shrink-0" />
          <span className="text-lg font-black tracking-tight text-sidebar-foreground font-outfit select-none">
            Admin Portal
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <SidebarMenuItem key={link.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={link.label}
                      className="w-full"
                    >
                      <Link href={link.href} className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">{link.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border gap-3">
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-sidebar-accent/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-blue-500/10">
              {user?.displayName?.[0] || user?.email?.[0] || "A"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold truncate text-sidebar-foreground leading-tight">
                {user?.displayName || user?.email?.split("@")[0] || "Admin"}
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
          className="w-full flex items-center justify-center gap-2 border border-sidebar-border hover:bg-sidebar-accent text-xs py-2 transition-all duration-300 rounded-lg font-medium"
        >
          <Link href="/">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Exit to Dashboard</span>
          </Link>
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
