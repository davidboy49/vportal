"use client";

import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { checkUserPinStatus, verifyPinAndCreateToken } from "@/actions/pin";
import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

function LoginForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(() => !auth ? "Firebase Authentication is not initialized. Please verify your environment variables in .env.local." : "");
    const [isSignUp, setIsSignUp] = useState(false);
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

    if (user) {
        return null;
    }

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
            // router.push(redirectUrl); // Removed: handled by useEffect when user state updates
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
            // router.push(redirectUrl); // Removed: handled by useEffect when user state updates
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
            await signInAnonymously(auth);
            // Redirection is handled by the useEffect above
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
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

    if (showPinInput && lastUser) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
                <Card className="w-full max-w-md transform-gpu transition-all duration-300 ease-out border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-6 bg-white/70 dark:bg-black/40 backdrop-blur-xl">
                    <CardHeader className="text-center pb-4">
                        <div className="flex justify-center mb-4">
                            {lastUser.photoURL ? (
                                <Image
                                    src={lastUser.photoURL}
                                    alt={lastUser.displayName || "User Avatar"}
                                    width={80}
                                    height={80}
                                    className="w-20 h-20 rounded-full border-2 border-blue-500 shadow-lg object-cover"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-2xl uppercase border-2 border-blue-500/20 shadow-md">
                                    {lastUser.email ? lastUser.email.slice(0, 2) : "U"}
                                </div>
                            )}
                        </div>
                        <CardTitle className="text-2xl font-bold font-outfit text-foreground/90">
                            Welcome back, {lastUser.displayName || lastUser.email?.split("@")[0] || "User"}
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-1">
                            Enter your 4-digit Quick Login PIN
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-center gap-6 py-2">
                            {[0, 1, 2, 3].map((index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "w-4 h-4 rounded-full border-2 transition-all duration-200",
                                        pin.length > index
                                            ? "bg-blue-500 border-blue-500 scale-110 shadow-md shadow-blue-500/40"
                                            : "border-muted-foreground/30 bg-transparent"
                                    )}
                                />
                            ))}
                        </div>

                        {pinError && (
                            <p className="text-sm text-destructive text-center font-medium animate-bounce">
                                {pinError}
                            </p>
                        )}

                        <div className="grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                                <Button
                                    key={num}
                                    variant="outline"
                                    type="button"
                                    onClick={() => handleKeyPress(num)}
                                    disabled={pinLoading}
                                    className="h-14 text-xl font-semibold border-black/5 dark:border-white/5 bg-background/50 hover:bg-black/5 dark:hover:bg-white/5 hover:scale-[1.05] transition-all rounded-xl select-none text-foreground"
                                >
                                    {num}
                                </Button>
                            ))}
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={handleClear}
                                disabled={pinLoading || pin.length === 0}
                                className="h-14 text-xs font-medium text-muted-foreground hover:text-foreground rounded-xl"
                            >
                                Clear
                            </Button>
                            <Button
                                variant="outline"
                                type="button"
                                onClick={() => handleKeyPress("0")}
                                disabled={pinLoading}
                                className="h-14 text-xl font-semibold border-black/5 dark:border-white/5 bg-background/50 hover:bg-black/5 dark:hover:bg-white/5 hover:scale-[1.05] transition-all rounded-xl select-none text-foreground"
                            >
                                0
                            </Button>
                            <Button
                                variant="ghost"
                                type="button"
                                onClick={handleDelete}
                                disabled={pinLoading || pin.length === 0}
                                className="h-14 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center rounded-xl"
                            >
                                Delete
                            </Button>
                        </div>
                    </CardContent>
                    <CardFooter className="justify-center border-t border-black/5 dark:border-white/5 pt-4">
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setShowPinInput(false)}
                            className="text-xs text-muted-foreground hover:text-blue-500 flex items-center gap-1.5 transition-colors"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Sign in with another account</span>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full items-center justify-center px-4 py-8">
            <Card className="w-full max-w-md transform-gpu transition-all duration-300 ease-out motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.01] motion-safe:hover:shadow-xl">
                <CardHeader>
                    <CardTitle>{isSignUp ? "Create an Account" : "Welcome Back"}</CardTitle>
                    <CardDescription>
                        {isSignUp ? "Enter your details to sign up" : "Enter your credentials to login"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="identifier">Username or Email</Label>
                            <Input
                                id="identifier"
                                type="text"
                                placeholder="username or you@example.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button type="submit" className="w-full">
                            {isSignUp ? "Sign Up" : "Login"}
                        </Button>
                    </form>
                    <div className="mt-4 space-y-2">
                        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                            Sign in with Google
                        </Button>
                        <Button variant="secondary" className="w-full" onClick={handleGuestSignIn}>
                            Continue as Guest
                        </Button>
                    </div>
                </CardContent>
                <CardFooter className="justify-center">
                    <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
                        {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
