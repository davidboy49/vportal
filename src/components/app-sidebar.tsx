"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useUserAvatar } from "@/hooks/use-user-avatar";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";
import { Sidebar, useSidebar } from "@/components/ui/sidebar";
import {
  SidebarAccountMenu,
  SidebarBrand,
  SidebarCard,
  SidebarNavItem,
  SidebarSectionLabel,
  WorkspaceSwitch,
  usePortalBranding,
} from "@/components/sidebar-kit";

/** Admin portal sidebar, built from the same pieces as the dashboard sidebar. */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const { avatarUrl } = useUserAvatar(user);
  const branding = usePortalBranding();
  const closeMobile = () => setOpenMobile(false);

  const [overview, ...sections] = ADMIN_NAV_LINKS;

  return (
    <Sidebar
      variant="floating"
      className="p-3 pr-0 [&>[data-slot=sidebar-inner]]:bg-transparent [&>[data-slot=sidebar-inner]]:shadow-none [&>[data-slot=sidebar-inner]]:ring-0"
      {...props}
    >
      <SidebarCard className="max-md:rounded-none max-md:border-0 max-md:shadow-none">
        <div className="space-y-3 p-3 pb-2">
          <SidebarBrand portalName={branding.portalName} logoUrl={branding.logoUrl} />
          <WorkspaceSwitch active="admin" onNavigate={closeMobile} />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-3 custom-scrollbar">
          <SidebarNavItem
            href={overview.href}
            icon={overview.icon}
            label={overview.label}
            active={pathname === overview.href}
            onClick={closeMobile}
          />
          <SidebarSectionLabel>Manage</SidebarSectionLabel>
          {sections.map((link) => (
            <SidebarNavItem
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={pathname === link.href || pathname.startsWith(`${link.href}/`)}
              onClick={closeMobile}
            />
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <SidebarAccountMenu
            name={user?.displayName || user?.email?.split("@")[0] || "Admin"}
            role="Administrator"
            avatarUrl={avatarUrl}
            initials={(user?.displayName || user?.email || "A").slice(0, 2)}
            onSignOut={() => signOut()}
          />
        </div>
      </SidebarCard>
    </Sidebar>
  );
}
