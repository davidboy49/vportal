"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { getUsers, setUserRole, createUserAction, changeUserPasswordAction, toggleUserStatusAction, deleteUsersAction } from "@/actions/users";
import { Loader2, Shield, ShieldOff, Download, Search, Key, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { exportToCsv } from "@/lib/export";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface AdminUser {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
    role: string;
    lastSignInTime?: string;
    creationTime?: string;
    disabled?: boolean;
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

export function UsersClient() {
    const { user } = useAuth();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showBanner = (message: string, type: "success" | "error" = "error") => setBanner({ message, type });

    // Confirmation dialogs (replace confirm())
    const [roleChangeTarget, setRoleChangeTarget] = useState<{ uid: string; currentRole: string } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

    // Create User Form State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createEmail, setCreateEmail] = useState("");
    const [createPassword, setCreatePassword] = useState("");
    const [createDisplayName, setCreateDisplayName] = useState("");
    const [createRole, setCreateRole] = useState<"ADMIN" | "USER">("USER");

    // Change Password Form State
    const [isPasswordOpen, setIsPasswordOpen] = useState(false);
    const [passwordUid, setPasswordUid] = useState("");
    const [passwordEmail, setPasswordEmail] = useState("");
    const [passwordNew, setPasswordNew] = useState("");

    // Filters & Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const fetchUsers = useCallback(async () => {
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const res = await getUsers(token);
            if (res.success && res.users) setUsers(res.users);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleRoleChangeConfirmed = async () => {
        if (!roleChangeTarget || !user) { setRoleChangeTarget(null); return; }
        try {
            const token = await user.getIdToken();
            const newRole = roleChangeTarget.currentRole === "ADMIN" ? "USER" : "ADMIN";
            await setUserRole(token, roleChangeTarget.uid, newRole);
            fetchUsers();
            showBanner(`Role changed to ${newRole}.`, "success");
        } catch (e) {
            console.error(e);
            showBanner("Failed to change role.", "error");
        } finally {
            setRoleChangeTarget(null);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setActionLoading(true);
        setActionError(null);

        try {
            const token = await user.getIdToken();
            const res = await createUserAction(token, {
                email: createEmail,
                password: createPassword,
                displayName: createDisplayName || undefined,
                role: createRole
            });

            if (res.success) {
                setIsCreateOpen(false);
                setCreateEmail(""); setCreatePassword(""); setCreateDisplayName(""); setCreateRole("USER");
                fetchUsers();
                showBanner("User created successfully.", "success");
            } else {
                setActionError(res.message || "Failed to create user");
            }
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "Unexpected error");
        } finally {
            setActionLoading(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setActionLoading(true);
        setActionError(null);

        try {
            const token = await user.getIdToken();
            const res = await changeUserPasswordAction(token, passwordUid, passwordNew);

            if (res.success) {
                setIsPasswordOpen(false);
                setPasswordNew(""); setPasswordUid(""); setPasswordEmail("");
                showBanner("Password updated successfully.", "success");
            } else {
                setActionError(res.message || "Failed to change password");
            }
        } catch (err: unknown) {
            setActionError(err instanceof Error ? err.message : "Unexpected error");
        } finally {
            setActionLoading(false);
        }
    };

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

    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

    useEffect(() => { setCurrentPage(1); }, [searchTerm, roleFilter]);

    const paginatedUsers = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredUsers, currentPage]);

    const handleToggleStatus = async (targetUid: string, currentStatus: boolean) => {
        if (!user) return;
        const newStatus = !currentStatus;
        try {
            setUsers(current => current.map(u => u.uid === targetUid ? { ...u, disabled: newStatus } : u));
            const token = await user.getIdToken();
            const res = await toggleUserStatusAction(token, targetUid, newStatus);
            if (!res.success) {
                setUsers(current => current.map(u => u.uid === targetUid ? { ...u, disabled: currentStatus } : u));
                showBanner(res.message || "Failed to toggle status", "error");
            }
        } catch (e) {
            setUsers(current => current.map(u => u.uid === targetUid ? { ...u, disabled: currentStatus } : u));
            console.error(e);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget || !user) { setDeleteTarget(null); return; }
        try {
            const token = await user.getIdToken();
            const res = await deleteUsersAction(token, [deleteTarget.uid]);
            if (res.success) {
                setUsers(current => current.filter(u => u.uid !== deleteTarget.uid));
                setSelectedUsers(current => current.filter(id => id !== deleteTarget.uid));
                showBanner("User deleted.", "success");
            } else {
                showBanner(res.message || "Failed to delete user", "error");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDeleteTarget(null);
        }
    };

    const handleBulkDeleteConfirmed = async () => {
        if (!user) { setBulkDeleteConfirm(false); return; }
        try {
            const token = await user.getIdToken();
            const res = await deleteUsersAction(token, selectedUsers);
            if (res.success) {
                setUsers(current => current.filter(u => !selectedUsers.includes(u.uid)));
                const count = selectedUsers.length;
                setSelectedUsers([]);
                if (res.failureCount && res.failureCount > 0) {
                    showBanner(`${count - res.failureCount} deleted, but ${res.failureCount} failed.`, "error");
                } else {
                    showBanner(`${count} user(s) deleted.`, "success");
                }
            } else {
                showBanner(res.message || "Failed to delete users", "error");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setBulkDeleteConfirm(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedUsers.length === paginatedUsers.length && paginatedUsers.length > 0) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(paginatedUsers.map(u => u.uid));
        }
    };

    const toggleSelectUser = (uid: string) => {
        setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
    };

    const handleExport = () => {
        const headers = ["User ID", "Email", "Display Name", "Role", "Last Sign In"];
        const rows = filteredUsers.map(u => [
            u.uid, u.email || "", u.displayName || "", u.role,
            u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleString() : "Never"
        ]);
        exportToCsv(`users_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            {banner && (
                <StatusBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Users</h2>
                    <p className="text-sm text-muted-foreground">Manage user roles and access controls.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    {selectedUsers.length > 0 && (
                        <Button variant="destructive" onClick={() => setBulkDeleteConfirm(true)} className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4" /> Delete Selected ({selectedUsers.length})
                        </Button>
                    )}
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                        <Download className="h-4 w-4" /> Export to Excel
                    </Button>
                    <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setActionError(null); }}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add User</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>New User Account</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Email Address</Label>
                                    <Input type="email" value={createEmail} onChange={e => setCreateEmail(e.target.value)} required placeholder="user@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Password</Label>
                                    <Input type="password" value={createPassword} onChange={e => setCreatePassword(e.target.value)} required placeholder="••••••••" minLength={6} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Display Name (Optional)</Label>
                                    <Input value={createDisplayName} onChange={e => setCreateDisplayName(e.target.value)} placeholder="John Doe" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Role</Label>
                                    <Select value={createRole} onValueChange={(val: "ADMIN" | "USER") => setCreateRole(val)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USER">USER</SelectItem>
                                            <SelectItem value="ADMIN">ADMIN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                                <Button type="submit" className="w-full" disabled={actionLoading}>
                                    {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create User
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by email or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <div className="w-full sm:w-[180px]">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger><SelectValue placeholder="Role: All" /></SelectTrigger>
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
                            <TableHead className="w-12 text-center">
                                <Checkbox
                                    checked={paginatedUsers.length > 0 && selectedUsers.length === paginatedUsers.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Display Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Sign In</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedUsers.map((u) => (
                            <TableRow key={u.uid} className="hover:bg-muted/30">
                                <TableCell className="text-center">
                                    <Checkbox
                                        checked={selectedUsers.includes(u.uid)}
                                        onCheckedChange={() => toggleSelectUser(u.uid)}
                                        disabled={u.email === user?.email}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">{u.email}</TableCell>
                                <TableCell>{u.displayName || "-"}</TableCell>
                                <TableCell>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${u.role === "ADMIN" ? "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"}`}>
                                        {u.role}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={!u.disabled}
                                            onCheckedChange={() => handleToggleStatus(u.uid, u.disabled ?? false)}
                                            disabled={u.email === user?.email}
                                            className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-50"
                                        />
                                        <span className="text-sm font-medium">{!u.disabled ? "Active" : "Inactive"}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{u.lastSignInTime ? new Date(u.lastSignInTime).toLocaleDateString() : "Never signed in"}</TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button
                                        variant="ghost" size="sm"
                                        onClick={() => { setPasswordUid(u.uid); setPasswordEmail(u.email || ""); setIsPasswordOpen(true); setActionError(null); }}
                                        className="h-8"
                                    >
                                        <Key className="h-4 w-4 mr-2" /> Password
                                    </Button>
                                    {u.email !== user?.email && (
                                        <>
                                            <Button variant="ghost" size="sm" onClick={() => setRoleChangeTarget({ uid: u.uid, currentRole: u.role })} className="h-8">
                                                {u.role === "ADMIN" ? <ShieldOff className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                                {u.role === "ADMIN" ? "Demote" : "Promote"}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(u)} className="h-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredUsers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    No users found matching the criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {filteredUsers.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
                    </span>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            )}

            {/* Change Password Dialog */}
            <Dialog open={isPasswordOpen} onOpenChange={(open) => { setIsPasswordOpen(open); if (!open) setActionError(null); }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
                    <p className="text-xs text-muted-foreground mb-2">
                        Updating password for: <span className="font-semibold text-foreground">{passwordEmail}</span>
                    </p>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="space-y-2">
                            <Label>New Password</Label>
                            <Input type="password" value={passwordNew} onChange={e => setPasswordNew(e.target.value)} required placeholder="••••••••" minLength={6} />
                        </div>
                        {actionError && <p className="text-xs text-red-500">{actionError}</p>}
                        <Button type="submit" className="w-full" disabled={actionLoading}>
                            {actionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Role Change Confirmation */}
            <AlertDialog open={!!roleChangeTarget} onOpenChange={(open) => { if (!open) setRoleChangeTarget(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Change User Role?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This user will be changed to <strong>{roleChangeTarget?.currentRole === "ADMIN" ? "USER" : "ADMIN"}</strong>. They will need to sign out and back in for the change to take effect.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRoleChangeConfirmed}>Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Single User Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete User?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{deleteTarget?.email}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirmation */}
            <AlertDialog open={bulkDeleteConfirm} onOpenChange={(open) => { if (!open) setBulkDeleteConfirm(false); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedUsers.length} User(s)?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected {selectedUsers.length} user(s). This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDeleteConfirmed} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete All</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
