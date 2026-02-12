"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { seedData } from "@/actions/seed";
import { useState } from "react";
import { Loader2, Database } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default function AdminDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSeed = async () => {
        if (!confirm("This will add sample categories and apps. Continue?")) return;
        if (!user) return;
        setLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await seedData(token);
            alert(res.message);
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your portal content and settings.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
                    <CardHeader>
                        <CardTitle>Apps</CardTitle>
                        <CardDescription>Manage applications listed in the portal.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin/apps">Manage Apps</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
                    <CardHeader>
                        <CardTitle>Categories</CardTitle>
                        <CardDescription>Organize apps into categories.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin/categories">Manage Categories</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
                    <CardHeader>
                        <CardTitle>Users</CardTitle>
                        <CardDescription>Manage user roles and access.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin/users">Manage Users</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
                    <CardHeader>
                        <CardTitle>Settings</CardTitle>
                        <CardDescription>Global portal configuration.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/admin/settings">Edit Settings</Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="border-yellow-500/50 bg-yellow-50/10 transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl dark:bg-yellow-900/10">
                    <CardHeader>
                        <CardTitle>System Actions</CardTitle>
                        <CardDescription>Maintenance tasks.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline" className="w-full" onClick={handleSeed} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                            Seed Initial Data
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
