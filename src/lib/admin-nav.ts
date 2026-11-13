import { Activity, Compass, FolderOpen, History, LayoutGrid, MessageSquare, Settings, Users } from "lucide-react";

/** Admin portal sections, shared by the admin sidebar and the mobile admin sheet. */
export const ADMIN_NAV_LINKS = [
    { href: "/admin", label: "Overview", shortLabel: "Overview", icon: LayoutGrid },
    { href: "/admin/apps", label: "Manage Apps", shortLabel: "Apps", icon: Compass },
    { href: "/admin/categories", label: "Categories", shortLabel: "Categories", icon: FolderOpen },
    { href: "/admin/users", label: "Users", shortLabel: "Users", icon: Users },
    { href: "/admin/sessions", label: "User Sessions", shortLabel: "Sessions", icon: Activity },
    { href: "/admin/changelog", label: "Change Logs", shortLabel: "Changes", icon: History },
    { href: "/admin/chats", label: "Chat Logs", shortLabel: "Chats", icon: MessageSquare },
    { href: "/admin/settings", label: "Portal Settings", shortLabel: "Settings", icon: Settings },
] as const;
