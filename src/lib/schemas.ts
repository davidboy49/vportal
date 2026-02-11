import { z } from "zod";

export const CategorySchema = z.object({
    name: z.string().min(1, "Name is required"),
    sortOrder: z.coerce.number().default(0),
    isActive: z.boolean().default(true),
});

export const AppSchema = z.object({
    name: z.string().min(1, "Name is required"),
    url: z.string().url("Must be a valid URL"),
    description: z.string().optional(),
    iconUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
    categoryId: z.string().min(1, "Category is required"),
    tags: z.string().transform(str => str.split(",").map(s => s.trim()).filter(Boolean)), // Comma separated string to array
    isActive: z.boolean().default(true),
});

export const SettingsSchema = z.object({
    portalName: z.string().min(1, "Portal Name is required"),
    logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
