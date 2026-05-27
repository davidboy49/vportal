"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getChatLogs } from "@/actions/chat-logs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Search, MessageSquare, Clock, User, ShieldAlert } from "lucide-react";

type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};

type ChatSession = {
    id: string;
    sessionId: string;
    userId: string;
    userEmail: string;
    userDisplayName: string;
    messages: ChatMessage[];
    lastMessageAt: string;
    ipAddress?: string;
};

const ITEMS_PER_PAGE = 12;

export default function AdminChatsPage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    
    // Filtering and View State
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

    const loadSessions = async () => {
        if (!user) return;
        setLoading(true);
        setError(null);

        try {
            const token = await user.getIdToken();
            const result = await getChatLogs(token, 100);
            if (!result.success) {
                setError(result.message || "Failed to load chat logs");
                return;
            }
            setSessions(result.logs as ChatSession[]);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load chat logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [user]);

    // Filtering logic
    const filteredSessions = useMemo(() => {
        return sessions.filter((session) => {
            const searchLower = searchTerm.toLowerCase();
            
            // Match email, name, IP or message content
            const matchesUser = 
                (session.userDisplayName || "").toLowerCase().includes(searchLower) ||
                (session.userEmail || "").toLowerCase().includes(searchLower) ||
                (session.ipAddress || "").toLowerCase().includes(searchLower) ||
                (session.sessionId || "").toLowerCase().includes(searchLower);

            const matchesMessages = session.messages?.some(msg => 
                (msg.content || "").toLowerCase().includes(searchLower)
            );

            return matchesUser || matchesMessages;
        });
    }, [sessions, searchTerm]);

    // Reset pagination when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredSessions.length / ITEMS_PER_PAGE));

    const paginatedSessions = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredSessions.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredSessions, currentPage]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                    Chat Logs
                </h1>
                <p className="text-muted-foreground">
                    Review and audit VPortal Assistant conversations for support and monitoring purposes.
                </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search chats by email, name, message contents, IP..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50"
                    />
                </div>
                <Button onClick={loadSessions} variant="outline" size="sm" className="w-full md:w-auto">
                    Refresh Logs
                </Button>
            </div>

            {loading && (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-blue-600 h-8 w-8" />
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-3 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <p className="text-sm font-medium">{error}</p>
                </div>
            )}

            {!loading && !error && (
                <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden bg-card">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>User / Guest</TableHead>
                                <TableHead className="w-[120px]">IP Address</TableHead>
                                <TableHead className="w-[120px]">Total Messages</TableHead>
                                <TableHead className="w-[180px]">Last Active</TableHead>
                                <TableHead className="w-[140px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedSessions.map((session) => (
                                <TableRow key={session.id} className="hover:bg-muted/30">
                                    <TableCell>
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-zinc-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/10">
                                                {session.userDisplayName?.[0] || session.userEmail?.[0] || "G"}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-semibold text-sm truncate max-w-[200px]">
                                                    {session.userDisplayName || "Guest User"}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                    {session.userEmail || "Guest"}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-xs font-mono text-muted-foreground">
                                        {session.ipAddress || "127.0.0.1"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-semibold">
                                            {session.messages?.length || 0} messages
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            {new Date(session.lastMessageAt).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            onClick={() => setSelectedSession(session)}
                                            size="sm"
                                            className="bg-blue-650 hover:bg-blue-700 text-white transition-all text-xs h-8"
                                        >
                                            View Transcript
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredSessions.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No chat logs found matching your criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Pagination Controls */}
            {!loading && filteredSessions.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredSessions.length)} of {filteredSessions.length} chat sessions
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

            {/* Transcript Dialog */}
            <Dialog open={selectedSession !== null} onOpenChange={(open) => !open && setSelectedSession(null)}>
                {selectedSession && (
                    <DialogContent className="max-w-[550px] max-h-[85vh] flex flex-col p-6 rounded-2xl overflow-hidden bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-white/20 dark:border-zinc-800/40">
                        <DialogHeader className="pb-4 border-b border-zinc-200/60 dark:border-zinc-800/40">
                            <DialogTitle className="text-lg font-bold font-outfit flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-blue-600" />
                                Chat Transcript
                            </DialogTitle>
                            <DialogDescription className="text-xs">
                                Session: <code className="font-mono text-blue-600 dark:text-blue-400">{selectedSession.sessionId}</code>
                            </DialogDescription>
                        </DialogHeader>

                        {/* Metadata Details */}
                        <div className="grid grid-cols-2 gap-4 py-3 bg-zinc-50 dark:bg-zinc-900/30 rounded-xl px-4 text-xs border border-zinc-200/30 dark:border-zinc-800/20">
                            <div>
                                <span className="text-muted-foreground block">User Profile</span>
                                <strong className="font-semibold">{selectedSession.userDisplayName || "Guest User"}</strong>
                                <span className="text-[10px] text-muted-foreground block truncate">{selectedSession.userEmail || "Guest Session"}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground block">Context Details</span>
                                <span className="block">IP: <strong>{selectedSession.ipAddress || "127.0.0.1"}</strong></span>
                                <span className="block text-[10px] text-muted-foreground">Active: {new Date(selectedSession.lastMessageAt).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Messages Transcript list */}
                        <div className="flex-1 overflow-y-auto py-4 space-y-4 max-h-[45vh] pr-2 custom-scrollbar">
                            {selectedSession.messages?.map((msg, index) => {
                                const isUser = msg.role === "user";
                                return (
                                    <div key={index} className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
                                        <div className={`flex max-w-[85%] items-start gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                                            {!isUser && (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-150 dark:bg-zinc-800 text-xs shadow-sm">
                                                    <img src="/chatbot_icon.png" alt="Bot" className="h-4.5 w-4.5 object-contain rounded-full" />
                                                </div>
                                            )}
                                            {isUser && (
                                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-zinc-800 text-blue-600 text-xs shadow-sm font-bold">
                                                    U
                                                </div>
                                            )}
                                            <div className={`rounded-xl px-3.5 py-2 text-sm shadow-sm leading-relaxed ${
                                                isUser
                                                    ? "bg-blue-600 text-white rounded-tr-none"
                                                    : "bg-zinc-100 dark:bg-zinc-900 text-zinc-850 dark:text-zinc-100 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/40"
                                            }`}>
                                                <p className="whitespace-pre-wrap select-text">{msg.content}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <DialogFooter className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/40">
                            <Button onClick={() => setSelectedSession(null)} className="bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 w-full sm:w-auto">
                                Close Transcript
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                )}
            </Dialog>
        </div>
    );
}
