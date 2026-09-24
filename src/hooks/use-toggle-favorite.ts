"use client";

import { useState } from "react";
import { App } from "@/lib/types";
import { toggleFavorite } from "@/actions/user-ops";
import { useAuth } from "@/context/AuthContext";

/**
 * Favorite toggling shared by the desktop AppCard and the mobile tiles:
 * optimistic update, localStorage for guests, server action for real users.
 */
export function useToggleFavorite(
    app: App,
    isFavorite: boolean,
    onToggleFavorite: (id: string, isFav: boolean) => void
) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) return;

        // Optimistic update
        onToggleFavorite(app.id, !isFavorite);

        const isGuest = user.isAnonymous || user.email === "guest@vportal.com";
        if (isGuest) {
            try {
                const storedFavs = localStorage.getItem("vportal_guest_favorites") || "[]";
                const favsList: string[] = JSON.parse(storedFavs);
                let nextList: string[];
                if (favsList.includes(app.id)) {
                    nextList = favsList.filter(id => id !== app.id);
                } else {
                    nextList = [...favsList, app.id];
                }
                localStorage.setItem("vportal_guest_favorites", JSON.stringify(nextList));
                window.dispatchEvent(new Event("vportal_guest_data_updated"));
            } catch (err) {
                console.error("Failed to save guest favorites", err);
                onToggleFavorite(app.id, isFavorite);
            }
            return;
        }

        try {
            setLoading(true);
            const token = await user.getIdToken();
            await toggleFavorite(token, app.id);
        } catch (err) {
            console.error("Failed to toggle favorite", err);
            // Revert on error
            onToggleFavorite(app.id, isFavorite);
        } finally {
            setLoading(false);
        }
    };

    return { handleFavorite, loading };
}
