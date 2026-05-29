"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOauthClientDetails, OauthClientInfo, createOAuthAuthorizationCode } from "@/actions/oauth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Loader2, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import Image from "next/image";

function StripeGradientBackground() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
            <div className="absolute inset-y-0 right-0 left-0 lg:left-1/3 overflow-hidden pointer-events-none">
                <div className="absolute top-[-30%] right-[-10%] w-[130%] h-[155%] origin-top-right transform -skew-y-12 rotate-[10deg] translate-x-[8%]">
                    <div className="absolute top-0 right-0 w-full h-[60%] bg-gradient-to-br from-violet-300 via-purple-400 to-transparent opacity-40 dark:opacity-20 filter blur-[90px]" />
                    <div className="absolute top-[20%] right-[10%] w-[70%] h-[50%] bg-gradient-to-r from-blue-300 via-indigo-400 to-transparent opacity-40 dark:opacity-20 filter blur-[80px]" />
                </div>
            </div>
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-violet-400/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-blue-450/5 rounded-full blur-[120px]" />
        </div>
    );
}

function AuthorizeContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useAuth();

    // Query params
    const clientId = searchParams.get("client_id") || "";
    const redirectUri = searchParams.get("redirect_uri") || "";
    const responseType = searchParams.get("response_type") || "";
    const state = searchParams.get("state") || "";
    const scope = searchParams.get("scope") || "";

    // States
    const [client, setClient] = useState<OauthClientInfo | null>(null);
    const [pageError, setPageError] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [loadingClient, setLoadingClient] = useState(true);

    // 1. Validate parameters and retrieve Client details from server
    useEffect(() => {
        if (!clientId) {
            setPageError("Invalid request: Missing client_id");
            setLoadingClient(false);
            return;
        }
        if (!redirectUri) {
            setPageError("Invalid request: Missing redirect_uri");
            setLoadingClient(false);
            return;
        }
        if (responseType !== "code") {
            setPageError("Invalid request: response_type must be 'code'");
            setLoadingClient(false);
            return;
        }

        async function fetchDetails() {
            setLoadingClient(true);
            try {
                const res = await getOauthClientDetails(clientId);
                if (res.success && res.client) {
                    // Client-side redirection match validation
                    const targetRedirect = redirectUri.split("?")[0].split("#")[0].trim().toLowerCase();
                    const match = res.client.redirectUris.some((uri) => {
                        const cleanUri = uri.split("?")[0].split("#")[0].trim().toLowerCase();
                        return cleanUri === targetRedirect;
                    });

                    if (!match) {
                        setPageError("Invalid callback URL: The requested redirect_uri is not registered.");
                    } else {
                        setClient(res.client);
                    }
                } else {
                    setPageError(res.message || "Failed to load OAuth application details");
                }
            } catch (err) {
                console.error(err);
                setPageError("An error occurred while loading client details");
            } finally {
                setLoadingClient(false);
            }
        }
        fetchDetails();
    }, [clientId, redirectUri, responseType]);

    // 2. Redirect to Login if not signed in
    useEffect(() => {
        if (!authLoading && !user) {
            const currentUrl = window.location.href;
            router.push(`/login?redirect=${encodeURIComponent(currentUrl)}`);
        }
    }, [user, authLoading, router]);

    // 3. User Approves Access
    const handleAllow = async () => {
        if (!user || !client) return;
        setActionLoading(true);
        setPageError("");
        try {
            const idToken = await user.getIdToken();
            const res = await createOAuthAuthorizationCode(clientId, redirectUri, idToken);
            if (res.success && res.code) {
                // Build redirection URL with authorization code
                const delimiter = redirectUri.includes("?") ? "&" : "?";
                let targetUrl = `${redirectUri}${delimiter}code=${res.code}`;
                if (state) {
                    targetUrl += `&state=${encodeURIComponent(state)}`;
                }
                window.location.href = targetUrl;
            } else {
                setPageError(res.message || "Failed to approve authorization");
                setActionLoading(false);
            }
        } catch (err) {
            console.error(err);
            setPageError("An error occurred during approval. Please try again.");
            setActionLoading(false);
        }
    };

    // 4. User Denies Access
    const handleDeny = () => {
        const delimiter = redirectUri.includes("?") ? "&" : "?";
        let targetUrl = `${redirectUri}${delimiter}error=access_denied`;
        if (state) {
            targetUrl += `&state=${encodeURIComponent(state)}`;
        }
        window.location.href = targetUrl;
    };

    // Loading states
    if (authLoading || loadingClient) {
        return (
            <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Establishing secure auth session...</p>
            </div>
        );
    }

    // Display page level errors
    if (pageError) {
        return (
            <Card className="w-full max-w-[420px] border border-red-200/80 dark:border-red-950/40 bg-white/95 dark:bg-zinc-950/90 shadow-2xl rounded-2xl p-6 backdrop-blur-xl">
                <CardHeader className="text-center pb-4 p-0">
                    <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-650 dark:text-red-400 flex items-center justify-center mx-auto mb-4 border border-red-200/50 dark:border-red-900/30">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-bold font-outfit text-red-650 dark:text-red-450">
                        Authentication Failed
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-2 text-center text-sm text-slate-650 dark:text-slate-400 leading-relaxed font-sans">
                    {pageError}
                </CardContent>
                <CardFooter className="justify-center pt-4 border-t border-slate-100 dark:border-zinc-900 mt-4 px-0 pb-0">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => router.push("/")}
                        className="text-xs rounded-lg"
                    >
                        Back to VPortal Dashboard
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    if (!user || !client) return null;

    return (
        <Card className="w-full max-w-[460px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 shadow-2xl rounded-2xl p-5 sm:p-6 md:p-8 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="p-0 pb-6 text-center select-none">
                {/* Visual Connection mapping from VPortal -> App */}
                <div className="flex items-center justify-center gap-5 mb-5">
                    {/* VPortal Logo */}
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-md p-1">
                        <Image 
                            src="/vportal_logo_v2.png" 
                            alt="VPortal Logo" 
                            width={36} 
                            height={36} 
                            unoptimized
                            className="object-cover rounded-lg"
                        />
                    </div>
                    
                    <div className="flex items-center gap-1 text-slate-300 dark:text-zinc-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <ArrowRight className="w-4 h-4 text-violet-500 animate-pulse mx-1" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    </div>

                    {/* Client App Logo */}
                    <div className="relative w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/80 shadow-md p-1">
                        {client.iconUrl ? (
                            <Image 
                                src={client.iconUrl} 
                                alt={`${client.name} Logo`} 
                                width={36} 
                                height={36} 
                                unoptimized
                                className="object-contain rounded-lg"
                            />
                        ) : (
                            <div className="w-full h-full rounded-lg bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-lg uppercase border border-violet-200/20">
                                {client.name.substring(0, 2)}
                            </div>
                        )}
                    </div>
                </div>

                <CardTitle className="text-xl font-bold font-outfit text-slate-800 dark:text-slate-100 tracking-tight">
                    Sign in to {client.name}
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                    using your VPortal single sign-on credential
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-5">
                {/* Logged in User Profile Info */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-zinc-900 bg-slate-50/50 dark:bg-zinc-900/35">
                    {user.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt="User Avatar"
                            width={36}
                            height={36}
                            unoptimized
                            className="w-9 h-9 rounded-full border border-slate-200 object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-violet-500/10">
                            {user.email ? user.email.slice(0, 2) : "U"}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-none mb-1">
                            {user.displayName || user.email?.split("@")[0] || "Active User"}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate leading-none">
                            {user.email}
                        </span>
                    </div>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-250/20 dark:border-emerald-800/20 select-none">
                        Signed In
                    </span>
                </div>

                {/* Scope Permissions Requested */}
                <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-650 select-none block">
                        Permission Requested:
                    </span>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <li className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>Read your basic profile (name, profile picture, user ID)</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>Access and verify your email address (<strong>{user.email}</strong>)</span>
                        </li>
                    </ul>
                </div>

                <div className="text-[10px] text-muted-foreground leading-relaxed p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-900 select-none">
                    🔑 Only allow access if you trust <strong>{client.name}</strong>. VPortal does not share your account password.
                </div>
            </CardContent>

            <CardFooter className="p-0 pt-6 mt-6 border-t border-slate-100 dark:border-zinc-900 flex gap-3">
                <Button 
                    variant="outline" 
                    onClick={handleDeny} 
                    disabled={actionLoading}
                    className="flex-1 rounded-lg text-xs"
                >
                    Cancel
                </Button>
                <Button 
                    onClick={handleAllow} 
                    disabled={actionLoading}
                    className="flex-1 bg-violet-650 hover:bg-violet-750 text-white shadow-sm transition-all rounded-lg text-xs"
                >
                    {actionLoading ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            Redirecting...
                        </>
                    ) : (
                        "Allow Access"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function AuthorizePage() {
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4">
            <StripeGradientBackground />
            <Suspense fallback={
                <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                    <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                    <p className="text-xs text-slate-400">Loading Authorize Portal...</p>
                </div>
            }>
                <AuthorizeContent />
            </Suspense>
        </div>
    );
}
