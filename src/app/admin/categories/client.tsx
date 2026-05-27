"use client";

import { useState, useMemo, useEffect } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { Loader2, Plus, Pencil, Trash2, Download, Search, CheckCircle2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/export";

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

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showBanner = (message: string, type: "success" | "error" = "error") => setBanner({ message, type });

    // Delete confirmation (replaces confirm())
    const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [sortOrder, setSortOrder] = useState(0);
    const [isActive, setIsActive] = useState(true);

    // Filters and Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        setBanner(null);

        try {
            const token = await user.getIdToken();
            const data = { name, sortOrder, isActive };

            if (editingCat) {
                const result = await updateCategory(token, editingCat.id, data);
                if (!result.success) {
                    showBanner(result.message || "Failed to save category.", "error");
                    return;
                }
                setCategories((current) =>
                    current.map((cat) => (cat.id === editingCat.id ? { ...cat, ...data } : cat))
                );
                showBanner("Category updated.", "success");
            } else {
                const result = await createCategory(token, data);
                if (!result.success || !result.id) {
                    showBanner(result.message || "Failed to save category.", "error");
                    return;
                }
                setCategories((current) => [...current, { id: result.id, ...data }]);
                showBanner("Category created.", "success");
            }

            setIsOpen(false);
            resetForm();
        } catch (error: unknown) {
            console.error(error);
            showBanner(error instanceof Error ? error.message : "An unexpected error occurred.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTarget || !user) { setDeleteTarget(null); return; }
        setLoading(true);
        setBanner(null);
        try {
            const token = await user.getIdToken();
            const result = await deleteCategory(token, deleteTarget.id);
            if (result.success) {
                setCategories((current) => current.filter((cat) => cat.id !== deleteTarget.id));
                showBanner(`Category "${deleteTarget.name}" deleted.`, "success");
            } else {
                showBanner(result.message || "Failed to delete category.", "error");
            }
        } catch (error) {
            console.error(error);
            showBanner("Unexpected error occurred while deleting category.", "error");
        } finally {
            setLoading(false);
            setDeleteTarget(null);
        }
    };

    const openEdit = (cat: Category) => {
        setEditingCat(cat);
        setName(cat.name);
        setSortOrder(cat.sortOrder);
        setIsActive(cat.isActive);
        setIsOpen(true);
    };

    const resetForm = () => {
        setEditingCat(null);
        setName("");
        setSortOrder(0);
        setIsActive(true);
    };

    const filteredCategories = useMemo(() => {
        return categories.filter((cat) => {
            const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && cat.isActive) ||
                (statusFilter === "INACTIVE" && !cat.isActive);
            return matchesSearch && matchesStatus;
        });
    }, [categories, searchTerm, statusFilter]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
    const paginatedCategories = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredCategories, currentPage]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Sort Order", "Status"];
        const rows = filteredCategories.map(cat => [
            cat.id, cat.name, cat.sortOrder.toString(), cat.isActive ? "Active" : "Inactive"
        ]);
        exportToCsv(`categories_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    return (
        <div className="space-y-6">
            {banner && (
                <StatusBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Categories</h2>
                    <p className="text-sm text-muted-foreground">Organize and sort application groups.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
                    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingCat ? "Edit Category" : "New Category"}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Sort Order</Label>
                                    <Input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                                    <Label>Active</Label>
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
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
                    <Input
                        placeholder="Search by category name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="w-full sm:w-[180px]">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger><SelectValue placeholder="Status: All" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Status</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded">
                        <Loader2 className="animate-spin text-primary h-8 w-8" />
                    </div>
                )}
                <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-[100px]">Sort Order</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedCategories.map((cat) => (
                                <TableRow key={cat.id} className="hover:bg-muted/30">
                                    <TableCell className="font-semibold">{cat.sortOrder}</TableCell>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={cat.isActive}
                                                className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-50"
                                                onCheckedChange={async (checked) => {
                                                    if (!user) return;
                                                    setCategories((current) =>
                                                        current.map((item) => (item.id === cat.id ? { ...item, isActive: checked } : item))
                                                    );
                                                    try {
                                                        const token = await user.getIdToken();
                                                        const result = await updateCategory(token, cat.id, {
                                                            name: cat.name, sortOrder: cat.sortOrder, isActive: checked,
                                                        });
                                                        if (!result.success) {
                                                            setCategories((current) =>
                                                                current.map((item) => (item.id === cat.id ? { ...item, isActive: !checked } : item))
                                                            );
                                                            showBanner(result.message || "Failed to toggle status.", "error");
                                                        }
                                                    } catch (e) {
                                                        console.error(e);
                                                        setCategories((current) =>
                                                            current.map((item) => (item.id === cat.id ? { ...item, isActive: !checked } : item))
                                                        );
                                                        showBanner("Failed to toggle status due to a network error.", "error");
                                                    }
                                                }}
                                            />
                                            <span className="text-sm font-medium">{cat.isActive ? "Active" : "Inactive"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} disabled={loading} className="h-8 w-8">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => setDeleteTarget(cat)} disabled={loading}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filteredCategories.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground py-4">
                                        No categories found matching criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {filteredCategories.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCategories.length)} of {filteredCategories.length} categories
                    </span>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation AlertDialog */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Category?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete <strong>{deleteTarget?.name}</strong> and reassign any apps in it to &quot;uncategorized&quot;. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteConfirmed}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
