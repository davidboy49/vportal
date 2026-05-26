"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { bootstrapAdmin } from "@/actions/auth";
import { Loader2, Shield } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

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
          <span className="text-xs font-bold text-muted-foreground font-outfit uppercase tracking-wider">
            Verifying Admin Access...
          </span>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        {/* Shadcn Sidebar */}
        <AppSidebar />

        {/* Main Content Area via SidebarInset */}
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          {/* Top Nav Header */}
          <header className="glass-panel py-3 px-6 flex h-16 shrink-0 items-center justify-between border-b border-black/5 dark:border-white/5 sticky top-0 z-10 w-full backdrop-blur-md">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1 text-foreground hover:bg-black/5 dark:hover:bg-white/5" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              
              {/* Breadcrumbs pathway */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none font-outfit uppercase tracking-wider">
                <span>Admin</span>
                <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <span className="text-foreground">
                  {pathname === "/admin"
                    ? "Overview"
                    : pathname.replace("/admin/", "").replace("-", " ")}
                </span>
              </div>
            </div>
          </header>

          {/* Page contents container */}
          <div className="p-6 space-y-6 max-w-7xl mx-auto w-full flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
