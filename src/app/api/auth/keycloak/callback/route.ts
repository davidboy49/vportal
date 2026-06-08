import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (!code) {
        return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Missing authorization code from Keycloak.")}`);
    }

    try {
        const issuer = process.env.KEYCLOAK_ISSUER;
        const clientId = process.env.KEYCLOAK_CLIENT_ID;
        const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
        const redirectUri = `${appUrl}/api/auth/keycloak/callback`;

        if (!issuer || !clientId || !clientSecret) {
            throw new Error("Keycloak server-side variables are not fully configured.");
        }

        if (!adminAuth || !adminDb) {
            throw new Error("Firebase Admin SDK was not initialized correctly.");
        }

        // 1. Exchange authorization code for token
        const tokenRes = await fetch(`${issuer}/protocol/openid-connect/token`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenRes.ok) {
            const errBody = await tokenRes.text();
            console.error("Token exchange failed:", errBody);
            throw new Error("Failed to exchange authentication code with Keycloak.");
        }

        const tokenData = await tokenRes.json();

        // 2. Fetch User Profile from Keycloak Userinfo endpoint
        const userinfoRes = await fetch(`${issuer}/protocol/openid-connect/userinfo`, {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userinfoRes.ok) {
            throw new Error("Failed to retrieve user profile from Keycloak.");
        }

        const profile = await userinfoRes.json();
        const email = profile.email;
        const uid = `keycloak_${profile.sub}`; // Ensure standard formatted unique keycloak prefix

        if (!email) {
            throw new Error("Email address is required from your Keycloak account profile.");
        }

        // 3. Find or Create User in Firebase Auth
        let firebaseUser;
        try {
            firebaseUser = await adminAuth.getUser(uid);
        } catch {
            try {
                // If ID didn't match, check by email
                firebaseUser = await adminAuth.getUserByEmail(email);
            } catch {
                // User doesn't exist, create a new one
                firebaseUser = await adminAuth.createUser({
                    uid,
                    email,
                    displayName: profile.name || profile.preferred_username || null,
                    photoURL: profile.picture || null,
                    emailVerified: true,
                });
            }
        }

        // 4. Boostrap Admin Role if email matches ADMIN_EMAIL config
        const adminEmail = process.env.ADMIN_EMAIL;
        let role = "USER";
        if (email === adminEmail) {
            role = "ADMIN";
            await adminAuth.setCustomUserClaims(firebaseUser.uid, { role: "ADMIN" });
        }

        // 5. Create or sync Firestore user document
        const userRef = adminDb.collection("users").doc(firebaseUser.uid);
        const doc = await userRef.get();
        if (!doc.exists) {
            await userRef.set({
                email: firebaseUser.email,
                role,
                createdAt: new Date().toISOString(),
            });
        } else if (email === adminEmail && doc.data()?.role !== "ADMIN") {
            await userRef.set({ role: "ADMIN" }, { merge: true });
        }

        // 6. Generate Firebase Custom Auth Token
        const customToken = await adminAuth.createCustomToken(firebaseUser.uid);

        // 7. Redirect back to VPortal login frontend with custom auth token
        return NextResponse.redirect(`${appUrl}/login?token=${encodeURIComponent(customToken)}`);

    } catch (error: any) {
        console.error("Keycloak Callback Error:", error);
        return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(error.message || "Authentication failed.")}`);
    }
}
