"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { setUserAvatar } from "@/actions/profile";

const GUEST_AVATAR_KEY = "vportal_guest_avatar";
const GUEST_AVATAR_EVENT = "vportal_guest_avatar_updated";

function isGuestUser(user: User) {
    return user.isAnonymous || user.email === "guest@vportal.com";
}

function subscribeGuestAvatar(callback: () => void) {
    window.addEventListener(GUEST_AVATAR_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
        window.removeEventListener(GUEST_AVATAR_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

function readGuestAvatar() {
    try {
        return localStorage.getItem(GUEST_AVATAR_KEY);
    } catch {
        return null;
    }
}

/**
 * The user's custom avatar (users/{uid}.avatarUrl, or localStorage for guests),
 * falling back to the sign-in provider's photo.
 */
export function useUserAvatar(user: User | null) {
    const isGuest = user ? isGuestUser(user) : false;
    const guestAvatar = useSyncExternalStore(subscribeGuestAvatar, readGuestAvatar, () => null);

    // Keyed by uid so a previous user's avatar is never shown for the next one.
    const [stored, setStored] = useState<{ uid: string; avatarUrl: string | null } | null>(null);

    useEffect(() => {
        if (!user || isGuest || !db) return;
        return onSnapshot(
            doc(db, "users", user.uid),
            (snapshot) => {
                const value = snapshot.data()?.avatarUrl;
                setStored({ uid: user.uid, avatarUrl: typeof value === "string" ? value : null });
            },
            (error) => console.error("Error fetching avatar:", error)
        );
    }, [user, isGuest]);

    const customAvatar = !user
        ? null
        : isGuest
            ? guestAvatar
            : stored?.uid === user.uid ? stored.avatarUrl : null;

    const saveAvatar = useCallback(async (avatarUrl: string | null) => {
        if (!user) return { success: false, message: "Not signed in" };

        if (isGuestUser(user)) {
            try {
                if (avatarUrl) localStorage.setItem(GUEST_AVATAR_KEY, avatarUrl);
                else localStorage.removeItem(GUEST_AVATAR_KEY);
                window.dispatchEvent(new Event(GUEST_AVATAR_EVENT));
                return { success: true };
            } catch {
                return { success: false, message: "Couldn't save avatar on this device." };
            }
        }

        const token = await user.getIdToken();
        const res = await setUserAvatar(token, avatarUrl);
        if (res.success) setStored({ uid: user.uid, avatarUrl });
        return res;
    }, [user]);

    return {
        avatarUrl: customAvatar || user?.photoURL || null,
        customAvatar,
        saveAvatar,
    };
}
