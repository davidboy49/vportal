"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAdminChangeLogs } from "@/actions/change-logs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ChangeLog = {
    id: string;
    action: string;
    targetType: string;
    targetId?: string;
    message: string;
    actorEmail?: string | null;
    createdAt: string;
};

export default function AdminChangeLogsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<ChangeLog[]>([]);

    useEffect(() => {
        const loadLogs = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);

            try {
                const token = await user.getIdToken();
                const result = await getAdminChangeLogs(token, 100);
                if (!result.success) {
                    setError(result.message || "Failed to load change logs");
                    return;
                }
                setLogs(result.logs as ChangeLog[]);
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Failed to load change logs");
            } finally {
                setLoading(false);
            }
        };

        loadLogs();
    }, [user]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Admin Change Logs</h1>
                <p className="text-muted-foreground">Recent admin actions across apps, categories, users, settings, and system tasks.</p>
            </div>

            {loading && <p className="text-sm text-muted-foreground">Loading logs...</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !error && logs.length === 0 && (
                <Card>
                    <CardContent className="pt-6 text-sm text-muted-foreground">No admin change logs found yet.</CardContent>
                </Card>
            )}

            <div className="space-y-3">
                {logs.map((log) => (
                    <Card key={log.id}>
                        <CardHeader className="pb-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <CardTitle className="text-base">{log.message}</CardTitle>
                                <Badge variant="secondary">{log.action}</Badge>
                            </div>
                            <CardDescription>
                                {new Date(log.createdAt).toLocaleString()} • {log.actorEmail || "Unknown admin"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-sm text-muted-foreground">
                            Target: {log.targetType}
                            {log.targetId ? ` (${log.targetId})` : ""}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
