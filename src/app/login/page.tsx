"use client";

import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { checkUserPinStatus, verifyPinAndCreateToken } from "@/actions/pin";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

// Custom SVG Icons for Stripe-style Social Buttons
const GoogleIcon = () => (
    <svg className="w-4 h-4 min-w-[16px] min-h-[16px]" viewBox="0 0 24 24">
        <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.68 1.54 14.98 1 12 1 7.35 1 3.37 3.65 1.39 7.56l3.85 2.99c.92-2.75 3.48-4.51 6.76-4.51z"/>
        <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.43c-.28 1.44-1.1 2.67-2.33 3.49l3.62 2.81c2.12-1.95 3.77-4.83 3.77-8.45z"/>
        <path fill="#FBBC05" d="M5.24 14.49c-.25-.76-.39-1.57-.39-2.49s.14-1.73.39-2.49L1.39 6.52C.5 8.32 0 10.1 0 12s.5 3.68 1.39 5.48l3.85-2.99z"/>
        <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.92l-3.62-2.81c-1.1.74-2.52 1.18-4.34 1.18-3.28 0-5.84-1.76-6.76-4.51L1.39 16.93C3.37 20.35 7.35 23 12 23z"/>
    </svg>
);

const PasskeyIcon = () => (
    <svg className="w-4 h-4 text-violet-500/90 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
);

const GuestIcon = () => (
    <svg className="w-4 h-4 text-violet-500/90 dark:text-violet-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

// High-fidelity Stripe-inspired Background Wave Component
function StripeGradientBackground() {
    return (
        <div className="absolute inset-0 -z-10 overflow-hidden bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
            {/* Main colorful canvas container */}
            <div className="absolute inset-y-0 right-0 left-0 lg:left-1/3 overflow-hidden pointer-events-none">
                {/* Diagonal colorful waves */}
                <div className="absolute top-[-30%] right-[-10%] w-[130%] h-[155%] origin-top-right transform -skew-y-12 rotate-[10deg] translate-x-[8%] lg:translate-x-[15%]">
                    {/* Layer 1: Sky Blue */}
                    <div 
                        className="absolute top-0 right-0 w-full h-[60%] bg-gradient-to-br from-sky-300 via-blue-400 to-transparent opacity-65 dark:opacity-35 mix-blend-multiply dark:mix-blend-screen filter blur-[70px] animate-pulse"
                        style={{ animationDuration: "8s" }}
                    />
                    
                    {/* Layer 2: Orange/Yellow */}
                    <div 
                        className="absolute top-[12%] right-[5%] w-[85%] h-[48%] bg-gradient-to-tr from-amber-400 via-orange-500 to-transparent opacity-55 dark:opacity-25 mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-pulse"
                        style={{ animationDuration: "12s" }}
                    />

                    {/* Layer 3: Hot Pink */}
                    <div 
                        className="absolute top-[22%] right-[10%] w-[75%] h-[52%] bg-gradient-to-r from-pink-400 via-rose-500 to-transparent opacity-60 dark:opacity-30 mix-blend-multiply dark:mix-blend-screen filter blur-[60px] animate-pulse"
                        style={{ animationDuration: "10s" }}
                    />

                    {/* Layer 4: Deep Purple/Indigo */}
                    <div 
                        className="absolute top-[32%] right-[15%] w-[68%] h-[58%] bg-gradient-to-bl from-fuchsia-400 via-violet-500 to-indigo-600 opacity-65 dark:opacity-40 mix-blend-multiply dark:mix-blend-screen filter blur-[90px]"
                    />

                    {/* Fine mesh grid lines for modern texture */}
                    <div className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] mix-blend-overlay bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.25)_1px,transparent_1px)] bg-[size:28px_28px]" />
                </div>
            </div>
            
            {/* Soft decorative background glows on the left for balance */}
            <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-sky-400/5 dark:bg-sky-400/2 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-violet-400/5 dark:bg-violet-400/2 rounded-full blur-[120px]" />
        </div>
    );
}

// Brand Logo Component
function BrandLogo() {
    return (
        <div className="flex items-center gap-2 select-none">
            <div className="relative w-7 h-7 flex items-center justify-center rounded-lg overflow-hidden border border-slate-200/80 dark:border-zinc-800/80 shadow-md">
                <Image 
                    src="/vportal_logo_v2.png" 
                    alt="VPortal Logo" 
                    fill
                    unoptimized
                    className="object-cover"
                />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-outfit">
                vportal
            </span>
        </div>
    );
}

function LoginForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(() => !auth ? "Firebase Authentication is not initialized. Please verify your environment variables in .env.local." : "");
    const [infoMessage, setInfoMessage] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [rememberMe, setRememberMe] = useState(true);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();


    // PIN Login States
    const [lastUser, setLastUser] = useState<{
        uid: string;
        email: string | null;
        displayName: string | null;
        photoURL: string | null;
        pinEnabled: boolean;
    } | null>(null);
    const [showPinInput, setShowPinInput] = useState(false);
    const [pin, setPin] = useState("");
    const [pinError, setPinError] = useState("");
    const [pinLoading, setPinLoading] = useState(false);

    const redirectUrl = searchParams.get("redirect") || "/";

    // Landscape images for multi-picture transitions
    const backgroundImages = [
        "/slideshow/login_hero_image.jpg",
        "/slideshow/rice_paddies_drone.jpg",
        "/slideshow/temple_sunrise.jpg",
        "/slideshow/misty_valley.jpg",
        "/slideshow/can-anyone-find-a-high-resolution-image-of-the-creation-of-v0-8xq1yhiw09q41.webp"
    ];
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const [isAutoPlaying, setIsAutoPlaying] = useState(true);

    // Rotate images every 15 seconds
    useEffect(() => {
        if (!isAutoPlaying) return;
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
        }, 15000);
        return () => clearInterval(interval);
    }, [backgroundImages.length, isAutoPlaying]);


    // Read last user and PIN status on mount
    useEffect(() => {
        try {
            const stored = window.localStorage.getItem("vportal-last-user");
            if (stored) {
                const parsed = JSON.parse(stored);
                setLastUser(parsed);
                if (parsed.pinEnabled) {
                    setShowPinInput(true);
                }
            }
        } catch (err) {
            console.error("Error reading last user from LocalStorage:", err);
        }
    }, []);

    // Redirect and save user details after successful login
    useEffect(() => {
        if (user) {
            checkUserPinStatus(user.uid).then((res) => {
                const lastUserInfo = {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    pinEnabled: res.success ? res.pinEnabled : false
                };
                window.localStorage.setItem("vportal-last-user", JSON.stringify(lastUserInfo));
            }).catch((err) => {
                console.error("Error checking PIN status after login:", err);
            }).finally(() => {
                router.push(redirectUrl);
            });
        }
    }, [user, router, redirectUrl]);


    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (!auth) {
            setError("Firebase Authentication is not initialized. Please verify your environment variables in .env.local.");
            return;
        }
        try {
            const emailToUse = identifier.includes("@") ? identifier : `${identifier}@vportal.app`;
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, emailToUse, password);
            } else {
                await signInWithEmailAndPassword(auth, emailToUse, password);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        if (!auth) {
            setError("Firebase Authentication is not initialized. Please verify your environment variables in .env.local.");
            return;
        }
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        }
    };

    const handleGuestSignIn = async () => {
        setError("");
        if (!auth) {
            setError("Firebase Authentication is not initialized. Please verify your environment variables in .env.local.");
            return;
        }
        try {
            // Log in using the shared guest account
            await signInWithEmailAndPassword(auth, "guest@vportal.com", "VPortalGuest123!");
        } catch (err: any) {
            // If the account does not exist, create it once dynamically
            if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
                try {
                    await createUserWithEmailAndPassword(auth, "guest@vportal.com", "VPortalGuest123!");
                    if (auth.currentUser) {
                        const { updateProfile } = await import("firebase/auth");
                        await updateProfile(auth.currentUser, { displayName: "Guest User" });
                    }
                } catch (createErr: any) {
                    setError(createErr instanceof Error ? createErr.message : "Failed to sign in as guest");
                }
            } else {
                setError(err instanceof Error ? err.message : "An unexpected error occurred");
            }
        }
    };

    const handleKeyPress = (num: string) => {
        if (pinLoading) return;
        setPinError("");
        const newPin = pin + num;
        if (newPin.length <= 4) {
            setPin(newPin);
        }
    };

    const handleDelete = () => {
        if (pinLoading) return;
        setPinError("");
        setPin(pin.slice(0, -1));
    };

    const handleClear = () => {
        if (pinLoading) return;
        setPinError("");
        setPin("");
    };

    // Trigger PIN verification when PIN reaches 4 digits
    useEffect(() => {
        if (pin.length === 4 && lastUser) {
            const verify = async () => {
                setPinLoading(true);
                setPinError("");
                try {
                    const res = await verifyPinAndCreateToken(lastUser.uid, pin);
                    if (res.success && res.customToken) {
                        await signInWithCustomToken(auth, res.customToken);
                    } else {
                        setPinError(res.message || "Failed to verify PIN");
                        setPin("");
                    }
                } catch (err) {
                    console.error("PIN verification error:", err);
                    setPinError("An error occurred during verification.");
                    setPin("");
                } finally {
                    setPinLoading(false);
                }
            };
            verify();
        }
    }, [pin, lastUser]);

    if (user) {
        return (
            <div className="flex h-screen w-full items-center justify-center flex-col gap-4 bg-slate-50 dark:bg-zinc-950 transition-colors duration-500">
                <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-violet-500/20 animate-ping" />
                        <Image
                            src="/vportal_logo_v2.png"
                            alt="VPortal"
                            width={40}
                            height={40}
                            unoptimized
                            className="relative z-10 w-10 h-10 rounded-lg object-cover border border-slate-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-black/20 p-0.5"
                        />
                    </div>
                    <div className="text-center space-y-1">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-outfit tracking-wide">
                            VPortal
                        </p>
                        <p className="text-xs text-muted-foreground">Redirecting to your workspace...</p>
                    </div>
                    <div className="flex gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-600 animate-bounce" />
                    </div>
                </div>
            </div>
        );
    }

    const renderRightPaneContent = () => {
        if (showPinInput && lastUser) {
            return (
                <Card className="w-full max-w-[420px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/90 shadow-2xl rounded-2xl p-5 sm:p-6 md:p-8 backdrop-blur-xl transform-gpu transition-all duration-300 ease-out">
                    <CardHeader className="text-center pb-4 p-0">
                        <div className="flex justify-center mb-4">
                            {lastUser.photoURL ? (
                                <Image
                                    src={lastUser.photoURL}
                                    alt={lastUser.displayName || "User Avatar"}
                                    width={80}
                                    height={80}
                                    unoptimized
                                    className="w-20 h-20 rounded-full border-2 border-violet-500/30 shadow-lg object-cover p-1 bg-white dark:bg-zinc-900"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-2xl uppercase border-2 border-violet-500/20 shadow-md">
                                    {lastUser.email ? lastUser.email.slice(0, 2) : "U"}
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-bold font-outfit text-slate-800 dark:text-slate-100 tracking-tight">
                            Welcome back, {lastUser.displayName || lastUser.email?.split("@")[0] || "User"}
                        </CardTitle>
                        <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                            Enter your 4-digit Quick Login PIN
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-6 px-0 pt-6 pb-0">
                        {/* PIN Indicator dots */}
                        <div className="flex justify-center gap-6 py-2">
                            {[0, 1, 2, 3].map((index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "w-3.5 h-3.5 rounded-full border-2 transition-all duration-200",
                                        pin.length > index
                                            ? "bg-violet-600 border-violet-600 scale-110 shadow-md shadow-violet-500/40"
                                            : "border-slate-300 dark:border-zinc-700 bg-transparent"
                                    )}
                                />
                            ))}
                        </div>

                        {pinError && (
                            <p className="text-sm text-red-500 text-center font-medium animate-bounce">
                                {pinError}
                            </p>
                        )}

                        {/* Numeric pad */}
                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    type="button"
                                    onClick={() => handleKeyPress(num)}
                                    disabled={pinLoading}
                                    className="h-14 text-xl font-semibold border-slate-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:scale-[1.05] active:scale-[0.98] transition-all rounded-xl select-none text-slate-800 dark:text-slate-100 shadow-sm"
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={handleClear}
                                disabled={pinLoading || pin.length === 0}
                                className="h-14 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl"
                            >
                                Clear
                            </Button>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => handleKeyPress("0")}
                                disabled={pinLoading}
                                className="h-14 text-xl font-semibold border-slate-200 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/60 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:scale-[1.05] active:scale-[0.98] transition-all rounded-xl select-none text-slate-800 dark:text-slate-100 shadow-sm"
                            >
                                0
                            </Button>
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={handleDelete}
                                disabled={pinLoading || pin.length === 0}
                                className="h-14 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center rounded-xl"
                            >
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                    
                    <CardFooter className="justify-center border-t border-slate-100 dark:border-zinc-900 pt-5 mt-6 px-0 pb-0">
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowPinInput(false)}
                            className="text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 flex items-center gap-1.5 transition-colors font-medium"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Sign in with another account</span>
                        </Button>
                    </CardFooter>
                </Card>
            );
        }

        return (
            <Card className="w-full max-w-[420px] border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/90 shadow-2xl rounded-2xl p-5 sm:p-6 md:p-8 backdrop-blur-xl transform-gpu transition-all duration-300 ease-out">
                <CardHeader className="p-0 pb-6 text-left">
                    <CardTitle className="text-2xl font-bold font-outfit text-slate-800 dark:text-slate-100 tracking-tight">
                        {isSignUp ? "Create your account" : "Sign in to your account"}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-sans">
                        {isSignUp ? "Enter your details to sign up for VPortal" : "Enter your credentials or use an integration"}
                    </CardDescription>
                </CardHeader>
                
                <CardContent className="p-0">
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="identifier" className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                Username or Email
                            </Label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="username or you@example.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                                className="h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-offset-0 placeholder:text-slate-400 transition-all font-sans"
                            />
                        </div>
                        
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <Label htmlFor="password" className="text-[13px] font-semibold text-slate-600 dark:text-slate-300">
                                    Password
                                </Label>
                                {!isSignUp && (
                                    <a 
                                        href="#" 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setInfoMessage("Password reset is not available in this portal. Please contact your system administrator.");
                                        }}
                                        className="text-xs text-violet-600 dark:text-violet-400 hover:underline hover:text-violet-700 font-medium transition-all"
                                    >
                                        Forgot your password?
                                    </a>
                                )}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 rounded-lg text-slate-800 dark:text-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500/20 focus-visible:border-violet-500 focus-visible:ring-offset-0 placeholder:text-slate-400 transition-all font-sans"
                            />
                        </div>

                        {/* Remember me on this device */}
                        <div className="flex items-center space-x-2 pt-1">
                            <Checkbox 
                                id="remember" 
                                checked={rememberMe}
                                onCheckedChange={(checked) => setRememberMe(!!checked)}
                                className="data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                            />
                            <label 
                                htmlFor="remember" 
                                className="text-xs text-slate-500 dark:text-slate-400 font-medium select-none cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                                Remember me on this device
                            </label>
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30 px-3 py-2 rounded-lg leading-relaxed">
                                {error}
                            </p>
                        )}

                        {infoMessage && (
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/30 px-3 py-2 rounded-lg leading-relaxed">
                                {infoMessage}
                            </p>
                        )}
                        
                        <Button 
                            type="submit" 
                            className="w-full h-10 mt-2 bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-700 text-white font-medium shadow-sm hover:shadow-md transition-all active:scale-[0.98] rounded-lg"
                        >
                            {isSignUp ? "Sign Up" : "Sign In"}
                        </Button>
                    </form>
                    
                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200 dark:border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white dark:bg-zinc-950 px-2 text-slate-400 dark:text-slate-500 font-medium select-none">
                                Or sign in with
                            </span>
                        </div>
                    </div>

                    {/* Integration Sign In Buttons */}
                    <div className="space-y-2">
                        <Button 
                            variant="outline" 
                            className="w-full h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 shadow-xs"
                            onClick={handleGoogleSignIn}
                        >
                            <GoogleIcon />
                            <span>Google</span>
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            className="w-full h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 shadow-xs"
                            onClick={() => setInfoMessage("Passkey enrollment is available from your Profile settings after signing in.")}
                        >
                            <PasskeyIcon />
                            <span>Passkey</span>
                        </Button>

                        <Button 
                            variant="outline" 
                            className="w-full h-10 bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 rounded-lg font-medium text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-2 shadow-xs"
                            onClick={handleGuestSignIn}
                        >
                            <GuestIcon />
                            <span>Continue as Guest</span>
                        </Button>
                    </div>
                </CardContent>
                
                <CardFooter className="justify-center p-0 pt-6 mt-6 border-t border-slate-100 dark:border-zinc-900">
                    <Button 
                        variant="link" 
                        onClick={() => {
                            setError("");
                            setIsSignUp(!isSignUp);
                        }}
                        className="text-xs text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 font-medium transition-colors p-0 h-auto"
                    >
                        {isSignUp ? "Already have an account? Sign in" : "New to VPortal? Create account"}
                    </Button>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col lg:flex-row bg-slate-50 dark:bg-zinc-950 overflow-hidden">
            {/* Left Pane: Hero Image and Zoom */}
            <div className="hidden lg:block lg:w-[30%] relative lg:h-screen overflow-hidden bg-slate-900 border-r border-slate-200 dark:border-zinc-800">
                {/* Logo Overlay on Left Image for Desktop */}
                <div className="absolute top-6 left-6 z-20 hidden lg:block">
                    <div className="flex items-center gap-2 select-none bg-white/80 dark:bg-black/50 backdrop-blur-md px-3.5 py-2 rounded-full border border-white/20 shadow-sm">
                        <div className="relative w-5 h-5 flex items-center justify-center rounded-md overflow-hidden border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
                            <Image 
                                src="/vportal_logo_v2.png" 
                                alt="VPortal Logo" 
                                fill
                                unoptimized
                                className="object-cover"
                            />
                        </div>
                        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white font-outfit">
                            VPortal
                        </span>
                    </div>
                </div>

                {/* Swipe Transition Image Container */}
                <div className="absolute inset-0 w-full h-full overflow-hidden bg-slate-900">
                    <div 
                        className="flex h-full w-full transition-transform duration-1000 ease-in-out"
                        style={{
                            transform: `translateX(-${currentImageIndex * 100}%)`,
                            willChange: "transform"
                        }}
                    >
                        {backgroundImages.map((src, index) => (
                            <div
                                key={src}
                                className="w-full h-full flex-shrink-0 relative"
                            >
                                <Image
                                    src={src}
                                    alt={`Landscape ${index + 1}`}
                                    fill
                                    priority={index === 0}
                                    sizes="(max-width: 1024px) 100vw, 30vw"
                                    className="object-cover"
                                    decoding="async"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="absolute inset-0 bg-black/5 dark:bg-black/20 pointer-events-none z-10" />
                </div>

                {/* Manual Image Slider Controls at the Bottom */}
                <div className="absolute bottom-6 left-0 right-0 z-20 flex flex-col items-center gap-2 px-4">
                    {/* Glassmorphic Control Panel */}
                    <div className="flex items-center gap-3.5 px-4.5 py-2 rounded-full bg-white/10 dark:bg-black/35 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg transition-all hover:bg-white/15 dark:hover:bg-black/45 animate-in fade-in slide-in-from-bottom duration-500">
                        {/* Previous Slide Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsAutoPlaying(false);
                                setCurrentImageIndex((prev) => (prev - 1 + backgroundImages.length) % backgroundImages.length);
                            }}
                            className="text-white hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-white/10 active:scale-95"
                            title="Previous Image"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        {/* Slide Dot Indicators */}
                        <div className="flex gap-2 items-center">
                            {backgroundImages.map((_, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => {
                                        setIsAutoPlaying(false);
                                        setCurrentImageIndex(index);
                                    }}
                                    className={cn(
                                        "w-2 h-2 rounded-full transition-all duration-300",
                                        currentImageIndex === index 
                                            ? "bg-white scale-125 shadow-md shadow-white/50 w-4.5" 
                                            : "bg-white/40 hover:bg-white/70"
                                    )}
                                    title={`Go to Slide ${index + 1}`}
                                />
                            ))}
                        </div>

                        {/* Next Slide Button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsAutoPlaying(false);
                                setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
                            }}
                            className="text-white hover:text-sky-300 transition-colors p-1 rounded-full hover:bg-white/10 active:scale-95"
                            title="Next Image"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Autoplay Play/Pause Button */}
                    <button
                        type="button"
                        onClick={() => setIsAutoPlaying(prev => !prev)}
                        className="text-[10px] text-white/70 hover:text-white transition-colors flex items-center gap-1.5 bg-black/35 hover:bg-black/45 px-2.5 py-1 rounded-full border border-white/5 backdrop-blur-xs select-none shadow-xs transition-all duration-300 hover:scale-105"
                    >
                        {isAutoPlaying ? (
                            <>
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                <span className="font-medium tracking-wide">Auto-rotate On</span>
                            </>
                        ) : (
                            <>
                                <span className="inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
                                <span className="font-medium tracking-wide">Auto-rotate Off</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Right Pane: Login Card Form */}
            <div className="w-full lg:w-[70%] relative flex flex-col justify-between p-4 sm:p-6 lg:p-12 min-h-screen">
                <StripeGradientBackground />
                
                {/* Header (Visible on mobile/tablet or for branding balance) */}
                <div className="z-10 flex justify-between items-center w-full lg:hidden">
                    <BrandLogo />
                    <ThemeToggle />
                </div>
                <div className="z-10 flex justify-between items-center w-full hidden lg:flex">
                    <div /> {/* Layout spacer on desktop */}
                    <ThemeToggle />
                </div>

                {/* Main Card */}
                <div className="z-10 flex items-center justify-center flex-grow py-8 md:py-12">
                    {renderRightPaneContent()}
                </div>

                {/* Page Footer */}
                <div className="z-10 flex justify-between items-center w-full text-xs text-slate-400 dark:text-slate-500 font-sans mt-auto">
                    <span>© VPortal</span>
                    <div className="flex gap-4">
                        <a href="#" className="hover:underline transition-all">Privacy & terms</a>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-500">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
