"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { App } from "@/lib/types";
import { User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { saveAppNote } from "@/actions/app-notes";
import { APP_NOTE_FIELDS, AppNote } from "@/lib/app-notes";

const GUEST_NOTES_KEY = "vportal_guest_app_notes";
const GUEST_NOTES_EVENT = "vportal_guest_app_notes_updated";

export type AppNotesMap = Record<string, AppNote>;

/** Lets app cards anywhere in the dashboard read notes and open the notes sheet. */
export const AppNotesContext = createContext<{ notes: AppNotesMap; openNotes: (app: App) => void } | null>(null);

export function useAppNotesContext() {
    return useContext(AppNotesContext);
}

function isGuestUser(user: User) {
    return user.isAnonymous || user.email === "guest@vportal.com";
}

function subscribeGuestNotes(callback: () => void) {
    window.addEventListener(GUEST_NOTES_EVENT, callback);
    window.addEventListener("storage", callback);
    return () => {
        window.removeEventListener(GUEST_NOTES_EVENT, callback);
        window.removeEventListener("storage", callback);
    };
}

function readGuestNotesRaw() {
    try {
        return localStorage.getItem(GUEST_NOTES_KEY);
    } catch {
        return null;
    }
}

function parseNotes(raw: string | null): AppNotesMap {
    if (!raw) return {};
    try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function pickNote(data: Record<string, unknown> | undefined): AppNote {
    const note: AppNote = {};
    for (const field of APP_NOTE_FIELDS) {
        const value = data?.[field];
        if (typeof value === "string" && value) note[field] = value;
    }
    return note;
}

/**
 * The user's private per-app login notes: live from Firestore for real users,
 * localStorage for guests.
 */
export function useAppNotes(user: User | null) {
    const isGuest = user ? isGuestUser(user) : false;
    const guestRaw = useSyncExternalStore(subscribeGuestNotes, readGuestNotesRaw, () => null);

    // Keyed by uid so a previous user's notes are never shown for the next one.
    const [stored, setStored] = useState<{ uid: string; notes: AppNotesMap } | null>(null);

    useEffect(() => {
        if (!user || isGuest || !db) return;
        return onSnapshot(
            collection(db, "users", user.uid, "appNotes"),
            (snapshot) => {
                const notes: AppNotesMap = {};
                snapshot.docs.forEach((d) => { notes[d.id] = pickNote(d.data()); });
                setStored({ uid: user.uid, notes });
            },
            (error) => console.error("Error fetching app notes:", error)
        );
    }, [user, isGuest]);

    const notes: AppNotesMap = !user
        ? {}
        : isGuest
            ? parseNotes(guestRaw)
            : stored?.uid === user.uid ? stored.notes : {};

    const saveNote = useCallback(async (appId: string, note: AppNote) => {
        if (!user) return { success: false, message: "Not signed in" };

        if (isGuestUser(user)) {
            try {
                const all = parseNotes(readGuestNotesRaw());
                const clean = pickNote(Object.fromEntries(
                    APP_NOTE_FIELDS.map((f) => [f, note[f]?.trim() ?? ""])
                ));
                if (Object.keys(clean).length === 0) delete all[appId];
                else all[appId] = clean;
                localStorage.setItem(GUEST_NOTES_KEY, JSON.stringify(all));
                window.dispatchEvent(new Event(GUEST_NOTES_EVENT));
                return { success: true };
            } catch {
                return { success: false, message: "Couldn't save notes on this device." };
            }
        }

        const token = await user.getIdToken();
        const res = await saveAppNote(token, appId, note);
        if (res.success) {
            // Show the change right away; the snapshot listener confirms it shortly after.
            const clean = pickNote(Object.fromEntries(APP_NOTE_FIELDS.map((f) => [f, note[f]?.trim() ?? ""])));
            setStored((prev) => {
                const next = { ...(prev?.uid === user.uid ? prev.notes : {}) };
                if (Object.keys(clean).length === 0) delete next[appId];
                else next[appId] = clean;
                return { uid: user.uid, notes: next };
            });
        }
        return res;
    }, [user]);

    return { notes, saveNote };
}
