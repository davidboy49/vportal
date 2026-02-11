import "server-only";
import { headers, cookies } from "next/headers";
import { adminAuth } from "./firebase/admin";
import { DecodedIdToken } from "firebase-admin/auth";

export async function verifyIdToken(token: string): Promise<DecodedIdToken | null> {
    if (!adminAuth) {
        console.error("Firebase Admin Authentication not initialized.");
        return null;
    }
    try {
        return await adminAuth.verifyIdToken(token);
    } catch (error) {
        console.error("Error verifying ID token:", error);
        return null;
    }
}

export async function getCurrentUser(): Promise<DecodedIdToken | null> {
    // Try to get token from Authorization header first
    const headersList = await headers();
    const authHeader = headersList.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.split("Bearer ")[1];
        return verifyIdToken(token);
    }

    // Fallback to session cookie (if you implement that mechanism)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session");

    if (sessionCookie) {
        // NOTE: If using session cookies managed by Firebase, you'd use verifySessionCookie instead
        // return adminAuth.verifySessionCookie(sessionCookie.value, true);

        // For now, assuming raw ID token might be stored (not recommended for long term, but for simple proof)
        // Or just return null if we only support Bearer tokens for API routes.
        return null;
    }

    return null;
}

export async function requireRole(role: string) {
    const user = await getCurrentUser();
    if (!user) {
        throw new Error("Unauthorized");
    }

    // Custom claims are on the user object
    // Assuming 'role' is a custom claim or part of the token
    // If you use custom claims:
    // const userRole = user[role] || user.role;

    // For basic checks, we might just check if the user exists or specific email
    // Here we'll assume a custom claim 'role' exists
    const userRole = user.role;

    if (userRole !== role) {
        throw new Error(`Forbidden: Requires ${role} role`);
    }

    return user;
}
