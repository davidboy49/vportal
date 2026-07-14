"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";
import { recordSession, pingSession, terminateSessionByUser } from "@/actions/sessions";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!auth) {
            console.error("Firebase Auth is not initialized. Check your environment variables in .env.local.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            setLoading(false);

            if (currentUser) {
                try {
                    const tokenResult = await currentUser.getIdTokenResult(true);
                    if (typeof window !== "undefined") {
                        const existingSessionId = window.sessionStorage.getItem("vportal-session-id");
                        if (!existingSessionId) {
                            const res = await recordSession(tokenResult.token);
                            if (res.success && res.sessionId) {
                                window.sessionStorage.setItem("vportal-session-id", res.sessionId);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error in auth state change session handler:", e);
                }
            } else {
                if (typeof window !== "undefined") {
                    window.sessionStorage.removeItem("vportal-session-id");
                }
            }
        });

        return () => unsubscribe();
    }, []);

    // Periodic heartbeat to verify the session hasn't been terminated by an admin
    useEffect(() => {
        if (!user) return;

        const checkSession = async () => {
            if (typeof window === "undefined") return;
            const sessionId = window.sessionStorage.getItem("vportal-session-id");
            if (!sessionId) return;

            try {
                const idToken = await user.getIdToken();
                const res = await pingSession(idToken, sessionId);
                if (res.success && res.terminated) {
                    console.warn("Session terminated by administrator.");
                    await signOut();
                }
            } catch (err) {
                console.error("Error checking session status:", err);
            }
        };

        // Run initial check and then periodically
        checkSession();
        const interval = setInterval(checkSession, 30000);

        // Also check when tab/window gains focus
        const handleFocus = () => {
            checkSession();
        };
        window.addEventListener("focus", handleFocus);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", handleFocus);
        };
    }, [user]);

    const signOut = async () => {
        try {
            if (!auth) {
                throw new Error("Auth not initialized");
            }

            // Terminate session on server if we have sessionId
            if (user && typeof window !== "undefined") {
                const sessionId = window.sessionStorage.getItem("vportal-session-id");
                if (sessionId) {
                    try {
                        const idToken = await user.getIdToken();
                        await terminateSessionByUser(idToken, sessionId);
                    } catch (err) {
                        console.error("Error terminating session on logout:", err);
                    }
                    window.sessionStorage.removeItem("vportal-session-id");
                }
            }

            await firebaseSignOut(auth);
            setUser(null);
            if (typeof window !== "undefined") {
                window.localStorage.setItem("vportal-logged-out", "true");
            }
            router.push("/login");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
