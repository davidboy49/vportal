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
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
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
        try {
            if (isSignUp) {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            // router.push(redirectUrl); // Removed: handled by useEffect when user state updates
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // router.push(redirectUrl); // Removed: handled by useEffect when user state updates
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleGuestSignIn = async () => {
        try {
            await signInAnonymously(auth);
            // Redirection is handled by the useEffect above
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>{isSignUp ? "Create an Account" : "Welcome Back"}</CardTitle>
                    <CardDescription>
                        {isSignUp ? "Enter your details to sign up" : "Enter your credentials to login"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAuth} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="m@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
