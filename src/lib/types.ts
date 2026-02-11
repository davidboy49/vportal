import { z } from "zod";
import { AppSchema, CategorySchema, SettingsSchema } from "./schemas";

export type App = z.infer<typeof AppSchema> & { id: string };
export type Category = z.infer<typeof CategorySchema> & { id: string };
export type Settings = z.infer<typeof SettingsSchema>;

export interface UserData {
    uid: string;
    email: string;
    role: "ADMIN" | "USER";
    favorites: string[]; // List of App IDs
    recent: string[]; // List of App IDs
}
