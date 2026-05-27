"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { App, Category } from "@/lib/types";
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
import { createApp, updateApp, deleteApp } from "@/actions/apps";
import { Loader2, Plus, Pencil, Trash2, Download, Search, CheckCircle2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/export";

const ITEMS_PER_PAGE = 10;

// Inline toast banner for success/error feedback (replaces alert())
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

export function AppsClient({ initialApps, categories }: { initialApps: App[], categories: Category[] }) {
    const { user } = useAuth();
    const [apps, setApps] = useState(initialApps);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<App | null>(null);

    // Banner feedback state (replaces alert())
    const [banner, setBanner] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const showBanner = (message: string, type: "success" | "error" = "error") => setBanner({ message, type });

    // Delete confirmation state (replaces confirm())
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

    // Icon file size warning (replaces alert())
    const [iconWarning, setIconWarning] = useState<string | null>(null);
    const [iconUrlWarning, setIconUrlWarning] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [desc, setDesc] = useState("");
    const [iconUrl, setIconUrl] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [tags, setTags] = useState("");
    const [isActive, setIsActive] = useState(true);

    // Filters and Pagination State
    const [searchTerm, setSearchTerm] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [currentPage, setCurrentPage] = useState(1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!name.trim() || !url.trim() || !categoryId) {
            showBanner("Missing required fields: Name, URL, and Category are mandatory.", "error");
            return;
        }

        setLoading(true);
        setBanner(null);

        try {
            const token = await user.getIdToken();
            const data = {
                name,
                url,
                description: desc,
                iconUrl,
                categoryId,
                tags,
                isActive
            };

            if (editingApp) {
                const result = await updateApp(token, editingApp.id, data);
                if (!result.success) {
                    showBanner(result.message || "Failed to save app.", "error");
                    return;
                }

                setApps((current) => current.map((app) => (
                    app.id === editingApp.id
                        ? {
                            ...app,
                            ...data,
                            tags: data.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
                        }
                        : app
                )));
            } else {
                const result = await createApp(token, data);
                if (!result.success || !result.id) {
                    showBanner(result.message || "Failed to save app.", "error");
                    return;
                }

                setApps((current) => [
                    ...current,
                    {
                        id: result.id,
                        name: data.name,
                        url: data.url,
                        description: data.description,
                        iconUrl: data.iconUrl,
                        categoryId: data.categoryId,
                        tags: data.tags.split(",").map((tag: string) => tag.trim()).filter(Boolean),
                        isActive: data.isActive,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }
                ]);
                showBanner("App saved successfully.", "success");
            }

            setIsOpen(false);
            resetForm();
        } catch (error) {
            console.error(error);
            showBanner("Unexpected error while saving app.", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteConfirmed = async () => {
        if (!deleteTargetId || !user) { setDeleteTargetId(null); return; }
        try {
            const token = await user.getIdToken();
            const result = await deleteApp(token, deleteTargetId);
            if (!result.success) {
                showBanner(result.message || "Failed to delete app.", "error");
            } else {
                setApps((current) => current.filter((app) => app.id !== deleteTargetId));
                showBanner("App deleted.", "success");
            }
        } catch (error) {
            console.error(error);
            showBanner("Unexpected error while deleting app.", "error");
        } finally {
            setDeleteTargetId(null);
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
        setIconWarning(null);
        setIconUrlWarning(null);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setIconWarning("File size is too large. Please select an image under 2 MB.");
            return;
        }
        setIconWarning(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const MAX_WIDTH = 128;
                const MAX_HEIGHT = 128;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL("image/webp", 0.8);
                    setIconUrl(dataUrl);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // Filter Logic
    const filteredApps = useMemo(() => {
        return apps.filter((app) => {
            const nameMatch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
            const descMatch = (app.description || "").toLowerCase().includes(searchTerm.toLowerCase());
            const urlMatch = app.url.toLowerCase().includes(searchTerm.toLowerCase());
            const tagsMatch = app.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesSearch = nameMatch || descMatch || urlMatch || tagsMatch;
            const matchesCategory = categoryFilter === "ALL" || app.categoryId === categoryFilter;
            const matchesStatus = statusFilter === "ALL" ||
                (statusFilter === "ACTIVE" && app.isActive) ||
                (statusFilter === "INACTIVE" && !app.isActive);
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [apps, searchTerm, categoryFilter, statusFilter]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, categoryFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredApps.length / ITEMS_PER_PAGE));
    const paginatedApps = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredApps.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredApps, currentPage]);

    const handleExport = () => {
        const headers = ["ID", "Name", "Category", "URL", "Description", "Tags", "Status"];
        const rows = filteredApps.map(app => [
            app.id, app.name,
            categories.find(c => c.id === app.categoryId)?.name || "Unknown",
            app.url, app.description || "",
            app.tags.join(", "),
            app.isActive ? "Active" : "Inactive"
        ]);
        exportToCsv(`apps_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    return (
        <div className="space-y-6">
            {/* Status Banner */}
            {banner && (
                <StatusBanner message={banner.message} type={banner.type} onDismiss={() => setBanner(null)} />
            )}

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Apps</h2>
                    <p className="text-sm text-muted-foreground">Manage portal applications, categories, and tags.</p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto">
                    <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
                        <Download className="h-4 w-4" /> Export
                    </Button>
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
                                    <div className="flex justify-between items-center">
                                        <Label>Icon (URL or Upload)</Label>
                                        {url && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    try {
                                                        const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
                                                        setIconUrl(`https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`);
                                                        setIconUrlWarning(null);
                                                    } catch {
                                                        const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
                                                        if (match && match[1]) {
                                                            setIconUrl(`https://www.google.com/s2/favicons?domain=${match[1]}&sz=128`);
                                                            setIconUrlWarning(null);
                                                        } else {
                                                            setIconUrlWarning("Please enter a valid App URL first.");
                                                        }
                                                    }
                                                }}
                                                className="text-xs text-primary hover:underline font-medium"
                                            >
                                                Use Website Icon
                                            </button>
                                        )}
                                    </div>
                                    {iconUrlWarning && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400">{iconUrlWarning}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <Input
                                            value={iconUrl}
                                            onChange={e => setIconUrl(e.target.value)}
                                            type="text"
                                            placeholder="https://example.com/icon.png or Base64"
                                            className="flex-1"
                                        />
                                        <div className="relative">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageUpload}
                                                className="hidden"
                                                id="icon-upload-input"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => document.getElementById("icon-upload-input")?.click()}
                                            >
                                                Upload
                                            </Button>
                                        </div>
                                        {iconUrl && (
                                            <div className="w-9 h-9 border border-border rounded flex items-center justify-center bg-muted shrink-0 p-1 overflow-hidden">
                                                <img
                                                    src={iconUrl}
                                                    alt="Preview"
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {iconWarning && (
                                        <p className="text-xs text-red-500 dark:text-red-400">{iconWarning}</p>
                                    )}
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
            </div>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-lg border border-black/5 dark:border-white/5">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name, description, tags, url..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <div className="w-full sm:w-[180px]">
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger><SelectValue placeholder="Category: All" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-full sm:w-[150px]">
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
            </div>

            {/* Table */}
            <div className="rounded-lg border border-black/5 dark:border-white/5 overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[80px]">Icon</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Tags</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedApps.map((app) => (
                            <TableRow key={app.id} className="hover:bg-muted/30">
                                <TableCell>
                                    {app.iconUrl ? (
                                        <Image src={app.iconUrl} alt={`${app.name} icon`} width={32} height={32} unoptimized className="w-8 h-8 rounded bg-muted object-contain" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground uppercase">
                                            {app.name.substring(0, 2)}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                        <span>{app.name}</span>
                                        <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px] sm:max-w-[300px]">{app.url}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{categories.find(c => c.id === app.categoryId)?.name || "Unknown"}</TableCell>
                                <TableCell className="max-w-[150px] truncate">
                                    <div className="flex flex-wrap gap-1">
                                        {app.tags.length > 0 ? app.tags.map((t, idx) => (
                                            <span key={idx} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">{t}</span>
                                        )) : "-"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center space-x-2">
                                        <Switch
                                            checked={app.isActive}
                                            className="data-[state=checked]:bg-zinc-950 dark:data-[state=checked]:bg-zinc-50"
                                            onCheckedChange={async (checked) => {
                                                if (!user) return;
                                                setApps((current) =>
                                                    current.map((item) => (item.id === app.id ? { ...item, isActive: checked } : item))
                                                );
                                                try {
                                                    const token = await user.getIdToken();
                                                    const data = {
                                                        name: app.name, url: app.url,
                                                        description: app.description || "", iconUrl: app.iconUrl || "",
                                                        categoryId: app.categoryId, tags: app.tags.join(", "), isActive: checked,
                                                    };
                                                    const result = await updateApp(token, app.id, data);
                                                    if (!result.success) {
                                                        setApps((current) =>
                                                            current.map((item) => (item.id === app.id ? { ...item, isActive: !checked } : item))
                                                        );
                                                        showBanner(result.message || "Failed to toggle status.", "error");
                                                    }
                                                } catch (e) {
                                                    console.error(e);
                                                    setApps((current) =>
                                                        current.map((item) => (item.id === app.id ? { ...item, isActive: !checked } : item))
                                                    );
                                                    showBanner("Failed to toggle status due to a network error.", "error");
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-medium">{app.isActive ? "Active" : "Inactive"}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(app)} className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => setDeleteTargetId(app.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filteredApps.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No apps found matching the criteria.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {filteredApps.length > 0 && (
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredApps.length)} of {filteredApps.length} apps
                    </span>
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</Button>
                        <span className="text-xs text-muted-foreground px-2">Page {currentPage} of {totalPages}</span>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation AlertDialog */}
            <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete App?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The app will be permanently removed from VPortal.
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
