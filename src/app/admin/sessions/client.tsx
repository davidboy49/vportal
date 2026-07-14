"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getSessions, terminateSession } from "@/actions/sessions";
import { Loader2, Search, Trash2, CheckCircle2, XCircle, RefreshCw, Laptop, Smartphone, HelpCircle, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserSession {
    id: string;
    uid: string;
    email: string;
    displayName: string;
    ip: string;
    geo: string;
    userAgent: string;
    createdAt: string;
    lastActive: string;
    status: string;
}

const ITEMS_PER_PAGE = 10;

function StatusBanner({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
    const isSuccess = type === "success";
    return (
        <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
            isSuccess
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300"
        }`}>
            {isSuccess ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
            <span className="flex-1 font-medium">{message}</span>
            <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 transition-opacity text-xs font-bold">✕</button>
        </div>
    );
}

function getFriendlyUserAgent(ua: string): { label: string; isMobile: boolean } {
    if (!ua) return { label: "Unknown Device", isMobile: false };
    
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let isMobile = false;

    // Browser detection
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/")) browser = "Safari";
    else if (ua.includes("MSIE ") || ua.includes("Trident/")) browser = "IE";

    // OS detection
    if (ua.includes("Windows NT")) os = "Windows";
    else if (ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Android")) { os = "Android"; isMobile = true; }
    else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS"; isMobile = true; }
    else if (ua.includes("Linux")) os = "Linux";

    return { label: `${browser} on ${os}`, isMobile };
}

function formatDate(dateStr: string) {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleString();
}

export function SessionsClient() {
    const { user, signOut } = useAuth();
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showBanner = (message: string, type: "success" | "error" = "error") => setBanner({ message, type });

    // Confirmation modal state
    const [terminateTarget, setTerminateTarget] = useState<UserSession | null>(null);

    // Filters & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    // Get current session ID from storage
    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentSessionId(window.sessionStorage.getItem("vportal-session-id"));
        }
    }, []);

    const fetchSessions = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await getSessions(token);
            if (res.success && res.sessions) {
                setSessions(res.sessions as UserSession[]);
            } else {
                showBanner(res.message || "Failed to load sessions", "error");
            }
        } catch (e) {
            console.error(e);
            showBanner("An unexpected error occurred while fetching sessions.", "error");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleTerminateConfirmed = async () => {
        if (!terminateTarget || !user) {
            setTerminateTarget(null);
            return;
        }

        setActionLoading(true);
        try {
            const token = await user.getIdToken();
            const res = await terminateSession(token, terminateTarget.id);

            if (res.success) {
                // If the user terminated their current session, sign out immediately
                if (terminateTarget.id === currentSessionId) {
                    showBanner("You have terminated your own session. Logging out...", "success");
                    setTimeout(() => {
                        signOut();
                    }, 1500);
                    return;
                }

                showBanner("Session terminated successfully.", "success");
                fetchSessions();
            } else {
                showBanner(res.message || "Failed to terminate session", "error");
            }
        } catch (e) {
            console.error(e);
            showBanner("Failed to terminate session.", "error");
        } finally {
            setActionLoading(false);
            setTerminateTarget(null);
        }
    };

    const filteredSessions = useMemo(() => {
        return sessions.filter((s) => {
            const email = (s.email || "").toLowerCase();
            const name = (s.displayName || "").toLowerCase();
            const ip = (s.ip || "").toLowerCase();
            const geo = (s.geo || "").toLowerCase();
            const query = searchTerm.toLowerCase();

            const matchesSearch = 
                email.includes(query) || 
                name.includes(query) || 
                ip.includes(query) || 
                geo.includes(query);

            const matchesStatus = 
                statusFilter === "ALL" || 
                s.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [sessions, searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const paginatedSessions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSessions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredSessions, currentPage]);

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-outfit text-foreground flex items-center gap-2">
                        <Activity className="h-6 w-6 text-blue-600 dark:text-blue-500 animate-pulse" />
                        User Sessions
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Monitor active user logins, locations, and terminate sessions if needed.
                    </p>
                </div>

                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                        setLoading(true);
                        fetchSessions();
                    }}
                    disabled={loading}
                    className="self-start sm:self-auto gap-2 border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {/* Notification Banner */}
            {banner && (
                <StatusBanner 
                    message={banner.message} 
                    type={banner.type} 
                    onDismiss={() => setBanner(null)} 
                />
            )}

            {/* Filters bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center glass-panel p-4 rounded-xl border border-black/5 dark:border-white/5">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by user, email, IP, or geo address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-transparent border-black/10 dark:border-white/10 text-sm focus-visible:ring-1 focus-visible:ring-blue-500"
                    />
                </div>

                <div className="w-full sm:w-[180px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="bg-transparent border-black/10 dark:border-white/10 text-sm">
                            <SelectValue placeholder="Filter by Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Sessions</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Main table */}
            <div className="glass-panel rounded-xl border border-black/5 dark:border-white/5 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500" />
                        <span className="text-xs font-semibold text-muted-foreground font-outfit uppercase tracking-wider">
                            Loading session records...
                        </span>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-black/[0.02] dark:bg-white/[0.02] border-b border-black/5 dark:border-white/5">
                                <TableRow>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">User / Email</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">IP Address</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">Geo Address</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">Device / Browser</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">Login Time</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground">Last Active</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground text-center">Status</TableHead>
                                    <TableHead className="font-semibold text-xs font-outfit uppercase tracking-wider text-muted-foreground text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedSessions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-sm text-muted-foreground">
                                            No session records found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSessions.map((session) => {
                                        const isCurrent = session.id === currentSessionId;
                                        const friendlyUA = getFriendlyUserAgent(session.userAgent);
                                        const isActive = session.status === "active";

                                        return (
                                            <TableRow 
                                                key={session.id} 
                                                className={`transition-colors border-b border-black/5 dark:border-white/5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] ${isCurrent ? "bg-blue-500/[0.03] dark:bg-blue-500/[0.02]" : ""}`}
                                            >
                                                <TableCell className="py-4">
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-sm text-foreground truncate flex items-center gap-1.5">
                                                            {session.displayName}
                                                            {isCurrent && (
                                                                <Badge className="bg-blue-100 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] py-0.5 px-1.5 font-bold uppercase tracking-wider">
                                                                    Current
                                                                </Badge>
                                                            )}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground truncate mt-0.5">{session.email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-sm font-mono text-muted-foreground select-all">
                                                    {session.ip}
                                                </TableCell>
                                                <TableCell className="py-4 text-sm text-foreground/80 font-medium">
                                                    {session.geo || "Unknown"}
                                                </TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        {friendlyUA.isMobile ? (
                                                            <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                                                        ) : (
                                                            <Laptop className="h-4 w-4 shrink-0 text-muted-foreground/80" />
                                                        )}
                                                        <span className="truncate max-w-[180px]" title={session.userAgent}>
                                                            {friendlyUA.label}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 text-xs text-muted-foreground font-sans">
                                                    {formatDate(session.createdAt)}
                                                </TableCell>
                                                <TableCell className="py-4 text-xs text-muted-foreground font-sans">
                                                    {formatDate(session.lastActive)}
                                                </TableCell>
                                                <TableCell className="py-4 text-center">
                                                    {isActive ? (
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-[10px] font-bold uppercase tracking-wider">
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold uppercase tracking-wider">
                                                            Terminated
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-4 text-right">
                                                    {isActive ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setTerminateTarget(session)}
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                            title={isCurrent ? "Terminate Current Session" : "Terminate Session"}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled
                                                            className="opacity-40"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Pagination Controls */}
                {!loading && filteredSessions.length > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-black/5 dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01]">
                        <span className="text-xs text-muted-foreground">
                            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of {filteredSessions.length} sessions
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="text-xs border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="text-xs border-black/5 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation AlertDialog */}
            <AlertDialog open={!!terminateTarget} onOpenChange={(open) => !open && setTerminateTarget(null)}>
                <AlertDialogContent className="glass-panel border-black/10 dark:border-white/10 rounded-2xl max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-outfit text-xl">
                            {terminateTarget?.id === currentSessionId ? "Terminate Your Current Session?" : "Terminate User Session?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm mt-2 text-muted-foreground leading-relaxed">
                            {terminateTarget?.id === currentSessionId ? (
                                <strong className="text-red-500 dark:text-red-400 block mb-2">
                                    Warning: You are terminating your current session. You will be logged out of the application immediately.
                                </strong>
                            ) : (
                                `Are you sure you want to terminate the active session for user "${terminateTarget?.displayName}"?`
                            )}
                            This action will force the user to log in again upon their next request or page refresh.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-2">
                        <AlertDialogCancel className="border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-sm rounded-xl">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleTerminateConfirmed}
                            disabled={actionLoading}
                            className="bg-red-600 hover:bg-red-700 text-white text-sm rounded-xl"
                        >
                            {actionLoading ? "Terminating..." : "Terminate Session"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
