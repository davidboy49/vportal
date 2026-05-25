"use client";

import { useState } from "react";
import { Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { createCategory, updateCategory, deleteCategory } from "@/actions/categories";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Categories</h2>
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

            {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
            )}

            <div className="relative">
                {loading && (
                    <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded">
                        <Loader2 className="animate-spin text-primary h-8 w-8" />
                    </div>
                )}
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Sort</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.map((cat) => (
                            <TableRow key={cat.id}>
                                <TableCell>{cat.sortOrder}</TableCell>
                                <TableCell className="font-medium">{cat.name}</TableCell>
                                <TableCell>{cat.isActive ? "Active" : "Inactive"}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(cat)} disabled={loading}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cat.id)} disabled={loading}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {categories.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                                    No categories found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

