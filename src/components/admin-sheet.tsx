"use client";

import Link from "next/link";
import { Camera, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { UserAvatar } from "@/components/avatar-dialog";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";

interface AdminSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
    onChangePhoto: () => void;
}

/** Mobile admin shortcuts, opened from the shield badge on an admin's avatar. */
export function AdminSheet({ open, onOpenChange, displayName, avatarUrl, initials, onChangePhoto }: AdminSheetProps) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-3xl border-x-0 p-0 pb-[env(safe-area-inset-bottom)]"
            >
                <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/25" aria-hidden="true" />
                <div className="space-y-5 p-5 pt-3">
                    <div className="flex items-center gap-3 pr-8">
                        <div className="relative shrink-0">
                            <UserAvatar src={avatarUrl} initials={initials} size={48} className="border-2 border-white shadow-sm dark:border-white/10" />
                            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-popover bg-amber-500 text-white">
                                <ShieldCheck className="h-3.5 w-3.5" />
                            </span>
                        </div>
                        <div className="min-w-0 flex-1">
                            <SheetTitle className="truncate font-outfit text-lg font-bold">{displayName}</SheetTitle>
                            <SheetDescription className="text-xs">Administrator</SheetDescription>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {ADMIN_NAV_LINKS.map(({ href, shortLabel, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => onOpenChange(false)}
                                className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border border-border bg-muted/30 p-1 text-center transition-transform active:scale-95"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <span className="line-clamp-1 text-[11px] font-semibold text-foreground">{shortLabel}</span>
                            </Link>
                        ))}
                    </div>

                    <button
                        type="button"
                        onClick={() => { onOpenChange(false); onChangePhoto(); }}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border text-sm font-medium text-foreground active:scale-[0.98]"
                    >
                        <Camera className="h-4 w-4" /> Change profile picture
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
