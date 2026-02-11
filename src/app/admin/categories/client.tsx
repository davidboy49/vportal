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
    const [categories, setCategories] = useState(initialCategories); // Keep local state for optimistic UI updates if desired, but we rely on revalidatePath usually
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<Category | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [sortOrder, setSortOrder] = useState(0);
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const token = await user.getIdToken();
            const data = { name, sortOrder, isActive };

            if (editingCat) {
                await updateCategory(token, editingCat.id, data);
            } else {
                await createCategory(token, data);
            }
            setIsOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        if (!user) return;
        try {
            const token = await user.getIdToken();
            await deleteCategory(token, id);
        } catch (error) {
            console.error(error);
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
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

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
                    {initialCategories.map((cat) => (
                        <TableRow key={cat.id}>
                            <TableCell>{cat.sortOrder}</TableCell>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell>{cat.isActive ? "Active" : "Inactive"}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(cat.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
