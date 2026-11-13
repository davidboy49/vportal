/** Per-user login notes for an app (users/{uid}/appNotes/{appId}). */
export interface AppNote {
    username?: string;
    password?: string;
    key?: string;
    hint?: string;
}

export const APP_NOTE_FIELDS = ["username", "password", "key", "hint"] as const;
export type AppNoteField = (typeof APP_NOTE_FIELDS)[number];

export const APP_NOTE_LABELS: Record<AppNoteField, string> = {
    username: "Username",
    password: "Password",
    key: "Key",
    hint: "Hint",
};

/** Fields hidden behind an eye toggle until revealed. */
export const SECRET_NOTE_FIELDS = new Set<AppNoteField>(["password", "key"]);

export function hasNoteContent(note: AppNote | undefined): boolean {
    return !!note && APP_NOTE_FIELDS.some((field) => !!note[field]);
}
