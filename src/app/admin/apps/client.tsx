"use client";

import { useState } from "react";
import { App, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { createApp, updateApp, deleteApp } from "@/actions/apps";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

export function AppsClient({ initialApps, categories }: { initialApps: App[], categories: Category[] }) {
    const { user } = useAuth();
    const [apps, setApps] = useState(initialApps);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<App | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [desc, setDesc] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tags, setTags] = useState("");
    const [isActive, setIsActive] = useState(true);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const token = await user.getIdToken();
            // AppSchema expects tags as array if directly parsed, but our schema transform handles comma string.
            // Wait, schema transform expects string -> array. 
            // So detailed implementation:

            const data = {
                name,
                url,
                description: desc,
                iconUrl,
                categoryId,
                tags, // Schema transform will handle split
                isActive
            };

            if (editingApp) {
                await updateApp(token, editingApp.id, data);
            } else {
                await createApp(token, data);
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
            await deleteApp(token, id);
        } catch (error) {
            console.error(error);
        }
    };

    const openEdit = (app: App) => {
        setEditingApp(app);
        setName(app.name);
        setUrl(app.url);
        setDesc(app.description || "");
        setIconUrl(app.iconUrl || "");
        setCategoryId(app.categoryId);
        setTags(app.tags.join(", "));
        setIsActive(app.isActive);
        setIsOpen(true);
    };

    const resetForm = () => {
        setEditingApp(null);
        setName("");
        setUrl("");
        setDesc("");
        setIconUrl("");
        setCategoryId("");
        setTags("");
        setIsActive(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Apps</h2>
                <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Add App</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>{editingApp ? "Edit App" : "New App"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category</Label>
                                    <Select value={categoryId} onValueChange={setCategoryId} required>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>URL</Label>
                                <Input value={url} onChange={e => setUrl(e.target.value)} required type="url" />
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Input value={desc} onChange={e => setDesc(e.target.value)} />
                            </div>

                            <div className="space-y-2">
                                <Label>Icon URL</Label>
                                <Input value={iconUrl} onChange={e => setIconUrl(e.target.value)} type="url" />
                            </div>

                            <div className="space-y-2">
                                <Label>Tags (comma separated)</Label>
                                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="Productivity, Internal, HR" />
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
                        <TableHead>Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {initialApps.map((app) => (
                        <TableRow key={app.id}>
                            <TableCell>
                                {app.iconUrl && <img src={app.iconUrl} className="w-8 h-8 rounded bg-muted object-contain" />}
                            </TableCell>
                            <TableCell className="font-medium">{app.name}</TableCell>
                            <TableCell>{categories.find(c => c.id === app.categoryId)?.name || "Unknown"}</TableCell>
                            <TableCell className="max-w-[150px] truncate">{app.tags.join(", ")}</TableCell>
                            <TableCell>{app.isActive ? "Active" : "Inactive"}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button variant="ghost" size="icon" onClick={() => openEdit(app)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(app.id)}>
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
