"use client";

import { useEffect, useState } from "react";

/** Current date that updates at local midnight, so date-based UI stays right in long-open tabs. */
export function useToday() {
    const [today, setToday] = useState(() => new Date());

    useEffect(() => {
        const nextMidnight = new Date(today);
        nextMidnight.setHours(24, 0, 1, 0);
        const timer = window.setTimeout(() => setToday(new Date()), nextMidnight.getTime() - Date.now());
        return () => window.clearTimeout(timer);
    }, [today]);

    return today;
}
