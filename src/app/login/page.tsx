"use client";

import { useState, useEffect, Suspense } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

function LoginForm() {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(() => !auth ? "Firebase Authentication is not initialized. Please verify your environment variables in .env.local." : "");
    const [isSignUp, setIsSignUp] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const redirectUrl = searchParams.get("redirect") || "/";

    useEffect(() => {
        if (user) {
            router.push(redirectUrl);
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
