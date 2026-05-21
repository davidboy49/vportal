"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return (
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-lg border border-transparent" aria-label="Toggle theme">
                <div className="w-5 h-5" />
            </Button>
        );
    }

    const isDark = theme === "dark";

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-9 h-9 rounded-lg border border-black/10 dark:border-white/10 bg-white/40 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-foreground transition-all duration-300 relative overflow-hidden group"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label="Toggle theme"
            id="theme-toggle-btn"
        >
            <div className="relative w-5 h-5 flex items-center justify-center">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all duration-500 ease-out dark:-rotate-90 dark:scale-0 text-amber-500 absolute" />
                <Moon className="h-5 w-5 rotate-90 scale-0 transition-all duration-500 ease-out dark:rotate-0 dark:scale-100 text-sky-400 absolute" />
            </div>
        </Button>
    );
}
