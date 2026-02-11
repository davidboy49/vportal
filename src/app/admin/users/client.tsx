"use client";

import { useState, useEffect } from "react";
import { UserData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/context/AuthContext";
import { getUsers, setUserRole } from "@/actions/users";
import { Loader2, Shield, ShieldOff } from "lucide-react";

export function UsersClient() {
    const { user } = useAuth();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
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
    };

    useEffect(() => {
        fetchUsers();
    }, [user]);

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold">Users</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Sign In</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((u) => (
                        <TableRow key={u.uid}>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === "ADMIN" ? "bg-red-100 text-red-800" : "bg-gray-100 text-gray-800"}`}>
                                    {u.role}
                                </span>
                            </TableCell>
                            <TableCell>{new Date(u.lastSignInTime).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                {u.email !== user?.email && (
                                    <Button variant="ghost" size="sm" onClick={() => toggleRole(u.uid, u.role)}>
                                        {u.role === "ADMIN" ? <ShieldOff className="h-4 w-4 mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
                                        {u.role === "ADMIN" ? "Demote" : "Promote"}
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
