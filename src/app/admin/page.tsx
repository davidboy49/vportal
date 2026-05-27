"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { seedData } from "@/actions/seed";
import { useState } from "react";
import { Loader2, Database } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [seedDialogOpen, setSeedDialogOpen] = useState(false);
  const [seedResult, setSeedResult] = useState<{ message: string; success: boolean } | null>(null);
  const [resultDialogOpen, setResultDialogOpen] = useState(false);

  const handleSeedConfirmed = async () => {
    setSeedDialogOpen(false);
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await seedData(token);
      setSeedResult({ message: res.message, success: true });
    } catch (e: unknown) {
      setSeedResult({
        message: e instanceof Error ? e.message : "Failed to seed data",
        success: false,
      });
    } finally {
      setLoading(false);
      setResultDialogOpen(true);
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

        <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
          <CardHeader>
            <CardTitle>Change Logs</CardTitle>
            <CardDescription>Review recent admin actions and audits.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/changelog">View Change Logs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
          <CardHeader>
            <CardTitle>Chat Logs</CardTitle>
            <CardDescription>Review conversations with the VPortal chatbot.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/chats">View Chat Logs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/50 bg-yellow-50/10 transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl dark:bg-yellow-900/10">
          <CardHeader>
            <CardTitle>System Actions</CardTitle>
            <CardDescription>Maintenance tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSeedDialogOpen(true)}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Database className="mr-2 h-4 w-4" />
              )}
              Seed Initial Data
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Seed Confirmation Dialog */}
      <Dialog open={seedDialogOpen} onOpenChange={setSeedDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-amber-500" />
              Seed Initial Data?
            </DialogTitle>
            <DialogDescription>
              This will add sample categories and apps to your Firestore database.
              Existing data will not be overwritten. Are you sure you want to continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSeedDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSeedConfirmed}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Yes, Seed Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed Result Dialog */}
      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle
              className={seedResult?.success ? "text-green-600 dark:text-green-400" : "text-destructive"}
            >
              {seedResult?.success ? "Seed Complete" : "Seed Failed"}
            </DialogTitle>
            <DialogDescription>{seedResult?.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
