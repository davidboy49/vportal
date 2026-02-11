"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export function useRequireAuth(redirectUrl = "/login") {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        if (!loading && !user) {
            router.push(redirectUrl + "?redirect=" + encodeURIComponent(pathname));
        }
    }, [user, loading, router, redirectUrl, pathname]);

    return { user, loading };
}
