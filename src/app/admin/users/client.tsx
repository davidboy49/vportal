"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getUsers, setUserRole } from "@/actions/users";
import { Loader2, Shield, ShieldOff, Download, Search } from "lucide-react";
import { exportToCsv } from "@/lib/export";

interface AdminUser {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: string;
    lastSignInTime?: string;
    creationTime?: string;
}

const ITEMS_PER_PAGE = 10;

export function UsersClient() {
    const { user } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await getUsers(token);
            if (res.success && res.users) {
                setUsers(res.users);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleRole = async (targetUid: string, currentRole: string) => {
        if (!confirm(`Change role to ${currentRole === "ADMIN" ? "USER" : "ADMIN"}?`)) return;
        if (!user) return;

        try {
            const token = await user.getIdToken();
            const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
            await setUserRole(token, targetUid, newRole);
            // Refresh list
            fetchUsers();
        } catch (e) {
            console.error(e);
        }
    };

    // Filtered users
    const filteredUsers = useMemo(() => {
        return users.filter((u) => {
            const email = (u.email || "").toLowerCase();
            const name = (u.displayName || "").toLowerCase();
            const query = searchTerm.toLowerCase();
            const matchesSearch = email.includes(query) || name.includes(query);
            const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
    
    // Reset page if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, roleFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    // Export to Excel handler
    const handleExport = () => {
        const headers = ["User ID", "Email", "Display Name", "Role", "Last Sign In"];
        const rows = filteredUsers.map(u => [
            u.uid,
            u.email || "",
            u.displayName || "",
            u.role,
            u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleString() : "Never"
        ]);
        exportToCsv(`users_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Users</h2>
                    <p className="text-sm text-muted-foreground">Manage user roles and access controls.</p>
                </div>
                <Button onClick={handleExport} className="self-start md:self-auto flex items-center gap-2">
                    <Download className="h-4 w-4" /> Export to Excel
                </Button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by email or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="w-full sm:w-[180px]">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger>
                            <SelectValue placeholder="Role: All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Roles</SelectItem>
                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                            <SelectItem value="USER">USER</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Last Sign In</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedUsers.map((u) => (
                            <TableRow key={u.uid} className="hover:bg-muted/30">
                                <TableCell className="font-medium">{u.email}</TableCell>
                                <TableCell>{u.displayName || "-"}</TableCell>
                                <TableCell>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === "ADMIN" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
                                        {u.role}
                                    </span>
                                </TableCell>
                                <TableCell>{u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleDateString() : "Never signed in"}</TableCell>
                                <TableCell className="text-right">
                                    {u.email !== user?.email && (
                                        <Button variant="ghost" size="sm" onClick={() => toggleRole(u.uid, u.role)} className="h-8">
                                            {u.role === "ADMIN" ? <ShieldOff className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                            {u.role === "ADMIN" ? "Demote" : "Promote"}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No users found matching the criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
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
