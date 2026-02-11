"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { bootstrapAdmin } from "@/actions/auth";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);

    useEffect(() => {
        const checkRole = async () => {
            if (!loading) {
                if (!user) {
                    router.push("/login");
                    return;
                }

                try {
                    // First, try to bootstrap admin if user matches ADMIN_EMAIL
                    const token = await user.getIdToken();
                    await bootstrapAdmin(token);

                    // Force token refresh to get new claims
                    const tokenResult = await user.getIdTokenResult(true);

                    if (tokenResult.claims.role === "ADMIN") {
                        console.log("Admin role confirmed for user");
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
        return <div className="flex h-screen items-center justify-center">Verifying Admin Access...</div>;
    }

    if (!isAdmin) return null;

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b bg-muted/40 px-6 py-3 flex items-center justify-between">
                <div className="font-bold flex gap-4">
                    <span>Admin Portal</span>
                    <nav className="flex gap-4 font-normal text-sm items-center">
                        <Link href="/admin">Overview</Link>
                        <Link href="/admin/apps">Apps</Link>
                        <Link href="/admin/categories">Categories</Link>
                        <Link href="/admin/users">Users</Link>
                    </nav>
                </div>
                <Button variant="ghost" asChild>
                    <Link href="/">Exit to Dashboard</Link>
                </Button>
            </header>
            <main className="flex-1 p-6">
                {children}
            </main>
        </div>
    );
}
