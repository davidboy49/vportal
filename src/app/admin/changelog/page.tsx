"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getAdminChangeLogs } from "@/actions/change-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Search } from "lucide-react";
import { exportToCsv } from "@/lib/export";

type ChangeLog = {
    id: string;
    action: string;
    targetType: string;
    targetId?: string;
    message: string;
    actorEmail?: string | null;
    createdAt: string;
};

const ITEMS_PER_PAGE = 15;

export default function AdminChangeLogsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [logs, setLogs] = useState<ChangeLog[]>([]);

    // Filters and Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [actionFilter, setActionFilter] = useState("ALL");
    const [targetFilter, setTargetFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const loadLogs = async () => {
            if (!user) return;
            setLoading(true);
            setError(null);

            try {
                const token = await user.getIdToken();
                const result = await getAdminChangeLogs(token, 200); // load more for pagination and filtering
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

    // Unique actions and target types for filters
    const uniqueActions = useMemo(() => {
        const actions = new Set(logs.map(log => log.action));
        return Array.from(actions);
    }, [logs]);

    const uniqueTargets = useMemo(() => {
        const targets = new Set(logs.map(log => log.targetType));
        return Array.from(targets);
    }, [logs]);

    // Filtering logic
    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            const matchesSearch = 
                (log.message || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.actorEmail || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.targetId || "").toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
            const matchesTarget = targetFilter === "ALL" || log.targetType === targetFilter;

            return matchesSearch && matchesAction && matchesTarget;
        });
    }, [logs, searchTerm, actionFilter, targetFilter]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, actionFilter, targetFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));

    const paginatedLogs = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredLogs.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredLogs, currentPage]);

    // CSV/Excel Export
    const handleExport = () => {
        const headers = ["Timestamp", "Actor", "Action", "Target Type", "Target ID", "Message"];
        const rows = filteredLogs.map(log => [
            new Date(log.createdAt).toLocaleString(),
            log.actorEmail || "System",
            log.action,
            log.targetType,
            log.targetId || "",
            log.message
        ]);
        exportToCsv(`changelogs_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Admin Change Logs</h1>
                    <p className="text-muted-foreground">Recent admin actions across apps, categories, users, settings, and system tasks.</p>
                </div>
                {!loading && logs.length > 0 && (
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2 self-start md:self-auto">
                        <Download className="h-4 w-4" /> Export logs
                    </Button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search logs by message, actor, target ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="w-full sm:w-[150px]">
                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Action: All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Actions</SelectItem>
                                {uniqueActions.map(action => (
                                    <SelectItem key={action} value={action}>{action}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-[150px]">
                        <Select value={targetFilter} onValueChange={setTargetFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Target: All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Targets</SelectItem>
                                {uniqueTargets.map(target => (
                                    <SelectItem key={target} value={target}>{target}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-primary h-8 w-8" />
                </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            {!loading && !error && (
                <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[180px]">Timestamp</TableHead>
                                <TableHead>Actor</TableHead>
                                <TableHead className="w-[100px]">Action</TableHead>
                                <TableHead className="w-[120px]">Target Type</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedLogs.map((log) => (
                                <TableRow key={log.id} className="hover:bg-muted/30">
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="font-medium text-xs max-w-[150px] truncate">
                                        {log.actorEmail || "System"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={log.action === "DELETE" ? "destructive" : log.action === "CREATE" ? "default" : "secondary"}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs font-semibold capitalize">
                                        {log.targetType.toLowerCase()}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        <div className="flex flex-col gap-1">
                                            <span>{log.message}</span>
                                            {log.targetId && (
                                                <span className="text-[10px] text-muted-foreground font-mono">ID: {log.targetId}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredLogs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No change logs found matching the criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredLogs.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length} logs
                    </span>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-xs text-muted-foreground px-2">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
