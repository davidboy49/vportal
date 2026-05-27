"use client";

import { useState, useMemo, useEffect } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { Loader2, Plus, Pencil, Trash2, Download, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/export";

const ITEMS_PER_PAGE = 10;

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
    const { user } = useAuth();
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        setErrorMessage(null);

        try {
            const token = await user.getIdToken();
            const data = { name, sortOrder, isActive };

            if (editingCat) {
                const result = await updateCategory(token, editingCat.id, data);
                if (!result.success) {
                    setErrorMessage(result.message || "Failed to save category.");
                    return;
                }
                setCategories((current) =>
                    current.map((cat) => (cat.id === editingCat.id ? { ...cat, ...data } : cat))
                );
            } else {
                const result = await createCategory(token, data);
                if (!result.success || !result.id) {
                    setErrorMessage(result.message || "Failed to save category.");
                    return;
                }
                setCategories((current) => [
                    ...current,
                    { id: result.id, ...data }
                ]);
            }

            setIsOpen(false);
            resetForm();
        } catch (error: unknown) {
            console.error(error);
            setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure? This will reassign any apps in this category to 'uncategorized'.")) return;
        if (!user) return;
        setLoading(true);
        setErrorMessage(null);
        try {
            const token = await user.getIdToken();
            const result = await deleteCategory(token, id);
            if (result.success) {
                setCategories((current) => current.filter((cat) => cat.id !== id));
            } else {
                setErrorMessage(result.message || "Failed to delete category.");
            }
        } catch (error) {
            console.error(error);
            setErrorMessage("Unexpected error occurred while deleting category.");
        } finally {
            setLoading(false);
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

    // Filters
    const filteredCategories = useMemo(() => {
        return categories.filter((cat) => {
            const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && cat.isActive) ||
                (statusFilter === "INACTIVE" && !cat.isActive);
            return matchesSearch && matchesStatus;
        });
    }, [categories, searchTerm, statusFilter]);

    // Reset pagination to 1 if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));

    const paginatedCategories = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredCategories.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredCategories, currentPage]);

    // Export to Excel
    const handleExport = () => {
        const headers = ["ID", "Name", "Sort Order", "Status"];
        const rows = filteredCategories.map(cat => [
            cat.id,
            cat.name,
            cat.sortOrder.toString(),
            cat.isActive ? "Active" : "Inactive"
        ]);
        exportToCsv(`categories_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    return (
        <div className="space-y-6">
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
                                {errorMessage && (
                                    <p className="text-sm text-red-500">{errorMessage}</p>
                                )}
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
            )}

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
                        <SelectTrigger>
                            <SelectValue placeholder="Status: All" />
                        </SelectTrigger>
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
                                        <Switch
                                            checked={cat.isActive}
                                            onCheckedChange={async (checked) => {
                                                if (!user) return;
                                                // Optimistic client-side state update
                                                setCategories((current) =>
                                                    current.map((item) => (item.id === cat.id ? { ...item, isActive: checked } : item))
                                                );
                                                try {
                                                    const token = await user.getIdToken();
                                                    const data = {
                                                        name: cat.name,
                                                        sortOrder: cat.sortOrder,
                                                        isActive: checked,
                                                    };
                                                    const result = await updateCategory(token, cat.id, data);
                                                    if (!result.success) {
                                                        // Revert on failure
                                                        setCategories((current) =>
                                                            current.map((item) => (item.id === cat.id ? { ...item, isActive: !checked } : item))
                                                        );
                                                        alert(result.message || "Failed to toggle status.");
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    // Revert on error
                                                    setCategories((current) =>
                                                        current.map((item) => (item.id === cat.id ? { ...item, isActive: !checked } : item))
                                                    );
                                                    alert("Failed to toggle status due to network error.");
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} disabled={loading} className="h-8 w-8">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDelete(cat.id)} disabled={loading}>
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

            {/* Pagination Controls */}
            {filteredCategories.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredCategories.length)} of {filteredCategories.length} categories
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
