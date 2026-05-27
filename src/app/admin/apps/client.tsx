"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { App, Category } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthContext";
import { createApp, updateApp, deleteApp } from "@/actions/apps";
import { Loader2, Plus, Pencil, Trash2, Download, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { exportToCsv } from "@/lib/export";

const ITEMS_PER_PAGE = 10;

export function AppsClient({ initialApps, categories }: { initialApps: App[], categories: Category[] }) {
    const { user } = useAuth();
    const [apps, setApps] = useState(initialApps);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [editingApp, setEditingApp] = useState<App | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
            const message = "Missing required fields: Name, URL, and Category are mandatory.";
            setErrorMessage(message);
            alert(`Admin alert: ${message}`);
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const token = await user.getIdToken();
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
                const result = await updateApp(token, editingApp.id, data);
                if (!result.success) {
                    const message = result.message || "Failed to save app.";
                    setErrorMessage(message);
                    alert(`Admin alert: ${message}`);
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
                    const message = result.message || "Failed to save app.";
                    setErrorMessage(message);
                    alert(`Admin alert: ${message}`);
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
            }

            setIsOpen(false);
            resetForm();
        } catch (error) {
            const message = "Unexpected error while saving app.";
            console.error(error);
            setErrorMessage(message);
            alert(`Admin alert: ${message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        if (!user) return;
        try {
            const token = await user.getIdToken();
            const result = await deleteApp(token, id);
            if (!result.success) {
                const message = result.message || "Failed to delete app.";
                setErrorMessage(message);
                alert(`Admin alert: ${message}`);
                return;
            }

            setApps((current) => current.filter((app) => app.id !== id));
        } catch (error) {
            console.error(error);
            const message = "Unexpected error while deleting app.";
            setErrorMessage(message);
            alert(`Admin alert: ${message}`);
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

    // Reset pagination to 1 if filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, categoryFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredApps.length / ITEMS_PER_PAGE));

    const paginatedApps = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredApps.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredApps, currentPage]);

    // CSV/Excel export handler
    const handleExport = () => {
        const headers = ["ID", "Name", "Category", "URL", "Description", "Tags", "Status"];
        const rows = filteredApps.map(app => [
            app.id,
            app.name,
            categories.find(c => c.id === app.categoryId)?.name || "Unknown",
            app.url,
            app.description || "",
            app.tags.join(", "),
            app.isActive ? "Active" : "Inactive"
        ]);
        exportToCsv(`apps_export_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    };

    return (
        <div className="space-y-6">
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
                                        <Label>Icon URL</Label>
                                        {url && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    try {
                                                        const parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
                                                        setIconUrl(`https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=128`);
                                                    } catch (e) {
                                                        const match = url.match(/^(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
                                                        if (match && match[1]) {
                                                            setIconUrl(`https://www.google.com/s2/favicons?domain=${match[1]}&sz=128`);
                                                        } else {
                                                            alert("Please enter a valid App URL first.");
                                                        }
                                                    }
                                                }}
                                                className="text-xs text-primary hover:underline font-medium"
                                            >
                                                Use Website Icon
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <Input 
                                            value={iconUrl} 
                                            onChange={e => setIconUrl(e.target.value)} 
                                            type="url" 
                                            placeholder="https://example.com/icon.png"
                                            className="flex-1"
                                        />
                                        {iconUrl && (
                                            <div className="w-9 h-9 border border-border rounded flex items-center justify-center bg-muted shrink-0 p-1 overflow-hidden">
                                                <img 
                                                    src={iconUrl} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-contain" 
                                                    onError={(e) => {
                                                        (e.target as HTMLElement).style.display = 'none';
                                                    }} 
                                                />
                                            </div>
                                        )}
                                    </div>
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
                            <SelectTrigger>
                                <SelectValue placeholder="Category: All" />
                            </SelectTrigger>
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
                                            <span key={idx} className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-semibold text-muted-foreground">
                                                {t}
                                            </span>
                                        )) : "-"}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Switch
                                        checked={app.isActive}
                                        onCheckedChange={async (checked) => {
                                            if (!user) return;
                                            // Optimistic client-side state update
                                            setApps((current) =>
                                                current.map((item) => (item.id === app.id ? { ...item, isActive: checked } : item))
                                            );
                                            try {
                                                const token = await user.getIdToken();
                                                const data = {
                                                    name: app.name,
                                                    url: app.url,
                                                    description: app.description || "",
                                                    iconUrl: app.iconUrl || "",
                                                    categoryId: app.categoryId,
                                                    tags: app.tags.join(", "),
                                                    isActive: checked,
                                                };
                                                const result = await updateApp(token, app.id, data);
                                                if (!result.success) {
                                                    // Revert on failure
                                                    setApps((current) =>
                                                        current.map((item) => (item.id === app.id ? { ...item, isActive: !checked } : item))
                                                    );
                                                    alert(result.message || "Failed to toggle status.");
                                                }
                                            } catch (e) {
                                                console.error(e);
                                                // Revert on error
                                                setApps((current) =>
                                                    current.map((item) => (item.id === app.id ? { ...item, isActive: !checked } : item))
                                                );
                                                alert("Failed to toggle status due to network error.");
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell className="text-right space-x-1">
                                    <Button variant="ghost" size="icon" onClick={() => openEdit(app)} className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleDelete(app.id)}>
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

            {errorMessage && (
                <p className="text-sm text-red-500">{errorMessage}</p>
            )}
        </div>
    );
}
