"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getOauthClientDetails, OauthClientInfo, createOAuthAuthorizationCode } from "@/actions/oauth";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import Image from "next/image";

function GridBackground() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
            {/* Subtle, clean gray grid pattern on a solid neutral background */}
            <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] dark:bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[size:16px_16px]" />
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
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm font-medium text-muted-foreground">Establishing secure auth session...</p>
            </div>
        );
    }

    // Display page level errors
    if (pageError) {
        return (
            <Card className="w-full max-w-[420px] border border-destructive/20 bg-card text-card-foreground shadow-sm rounded-xl p-6">
                <CardHeader className="text-center pb-4 p-0">
                    <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto mb-4 border border-destructive/20">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl font-bold font-outfit text-destructive">
                        Authentication Failed
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-0 py-2 text-center text-sm text-muted-foreground leading-relaxed font-sans">
                    {pageError}
                </CardContent>
                <CardFooter className="justify-center pt-4 border-t border-border mt-4 px-0 pb-0">
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
        <Card className="w-full max-w-[440px] border border-border bg-card text-card-foreground shadow-sm rounded-xl p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardHeader className="p-0 pb-6 text-center select-none">
                {/* Visual Connection mapping from VPortal -> App */}
                <div className="flex items-center justify-center gap-4 mb-6">
                    {/* VPortal Logo */}
                    <div className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border p-1 shadow-xs">
                        <Image 
                            src="/vportal_logo_v2.png" 
                            alt="VPortal Logo" 
                            width={32} 
                            height={32} 
                            unoptimized
                            className="object-cover rounded-md"
                        />
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />

                    {/* Client App Logo */}
                    <div className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-background border border-border p-1 shadow-xs">
                        {client.iconUrl ? (
                            <Image 
                                src={client.iconUrl} 
                                alt={`${client.name} Logo`} 
                                width={32} 
                                height={32} 
                                unoptimized
                                className="object-contain rounded-md"
                            />
                        ) : (
                            <div className="w-full h-full rounded-md bg-muted text-muted-foreground flex items-center justify-center font-bold text-sm uppercase">
                                {client.name.substring(0, 2)}
                            </div>
                        )}
                    </div>
                </div>

                <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                    Sign in to {client.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-1">
                    using your VPortal single sign-on credential
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0 space-y-5">
                {/* Logged in User Profile Info */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                    {user.photoURL ? (
                        <Image
                            src={user.photoURL}
                            alt="User Avatar"
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 rounded-full border border-border object-cover shrink-0"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs uppercase shrink-0 border border-border">
                            {user.email ? user.email.slice(0, 2) : "U"}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold text-foreground truncate leading-none mb-0.5">
                            {user.displayName || user.email?.split("@")[0] || "Active User"}
                        </span>
                        <span className="text-[10px] text-muted-foreground truncate leading-none">
                            {user.email}
                        </span>
                    </div>
                    <span className="ml-auto inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400 border border-emerald-250/20 dark:border-emerald-800/20 select-none">
                        Signed In
                    </span>
                </div>

                {/* Scope Permissions Requested */}
                <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none block">
                        Permissions requested
                    </span>
                    <ul className="space-y-2 text-xs text-muted-foreground">
                        <li className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
                            <span>Read your basic profile (name, profile picture, user ID)</span>
                        </li>
                        <li className="flex gap-2">
                            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0 mt-0.5" />
                            <span>Access and verify your email address (<strong>{user.email}</strong>)</span>
                        </li>
                    </ul>
                </div>

                <div className="text-[10px] text-muted-foreground leading-relaxed p-3 rounded-lg bg-muted/40 border border-border select-none font-sans">
                    Only authorize this access if you trust the application. VPortal does not share your credential passwords.
                </div>
            </CardContent>

            <CardFooter className="p-0 pt-6 mt-6 border-t border-border flex gap-3">
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
                    className="flex-1 rounded-lg text-xs"
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
            <GridBackground />
            <Suspense fallback={
                <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <p className="text-xs text-muted-foreground">Loading Authorize Portal...</p>
                </div>
            }>
                <AuthorizeContent />
            </Suspense>
        </div>
    );
}
