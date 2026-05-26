import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
    title: string;
    description?: string;
    icon: LucideIcon;
    iconColorClass?: string;
    iconBgClass?: string;
    actions?: React.ReactNode;
}

export function AdminHeader({
    title,
    description,
    icon: Icon,
    iconColorClass = "text-blue-600 dark:text-blue-400",
    iconBgClass = "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50",
    actions,
}: AdminHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-zinc-900/40 p-5 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Styled Icon Container */}
                <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-xl border shrink-0 transition-colors duration-300",
                    iconBgClass
                )}>
                    <Icon className={cn("w-6 h-6", iconColorClass)} />
                </div>
                
                {/* Title & Subtitle */}
                <div className="space-y-0.5">
                    <h1 className="text-xl font-bold tracking-tight text-foreground font-outfit">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                            {description}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions on the right */}
            {actions && (
                <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
