"use server";

import { adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import crypto from "crypto";

export interface OauthClientInfo {
    name: string;
    iconUrl?: string;
    url: string;
    redirectUris: string[];
}

/**
 * Retrieves public client application configuration details securely on the server.
 */
export async function getOauthClientDetails(clientId: string) {
    try {
        if (!clientId || typeof clientId !== "string") {
            return { success: false, message: "Client ID is required" };
        }
        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        const snapshot = await adminDb
            .collection("apps")
            .where("clientId", "==", clientId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, message: "Client application not found" };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();

        if (!data.oauthEnabled) {
            return { success: false, message: "OAuth is not enabled for this application" };
        }

        // Split comma-separated redirect URIs
        const redirectUris = (data.redirectUris || "")
            .split(",")
            .map((url: string) => url.trim())
            .filter(Boolean);

        const clientInfo: OauthClientInfo = {
            name: data.name,
            iconUrl: data.iconUrl || undefined,
            url: data.url,
            redirectUris,
        };

        return { success: true, client: clientInfo };
    } catch (error) {
        console.error("Error fetching OAuth client details:", error);
        return { success: false, message: "Failed to fetch client details" };
    }
}

/**
 * Verifies the user session token and generates a temporary authorization code.
 */
export async function createOAuthAuthorizationCode(
    clientId: string,
    redirectUri: string,
    idToken: string
) {
    try {
        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        // 1. Verify User Session Token
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Invalid session or not authenticated" };
        }

        // 2. Fetch and Validate client application
        const clientResult = await getOauthClientDetails(clientId);
        if (!clientResult.success || !clientResult.client) {
            return { success: false, message: clientResult.message || "Invalid client" };
        }

        const client = clientResult.client;

        // 3. Verify Redirect URI matches one of the registered Callback URLs
        const cleanRedirectUri = redirectUri.split("?")[0].split("#")[0].trim().toLowerCase();
        const redirectMatch = client.redirectUris.some((uri) => {
            const cleanUri = uri.split("?")[0].split("#")[0].trim().toLowerCase();
            return cleanUri === cleanRedirectUri;
        });

        if (!redirectMatch) {
            return { success: false, message: "Redirect URI is not authorized for this client" };
        }

        // 4. Generate random authorization code (32-character hex string)
        const code = crypto.randomBytes(16).toString("hex");

        // 5. Store temporary code document in Firestore (expires in 5 minutes)
        await adminDb.collection("oauth_codes").doc(code).set({
            code,
            clientId,
            redirectUri,
            userId: user.uid,
            email: user.email || null,
            name: user.name || user.displayName || null,
            photoUrl: user.picture || user.photoURL || null,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes validity
            createdAt: new Date().toISOString(),
        });

        return { success: true, code };
    } catch (error) {
        console.error("Error generating OAuth code:", error);
        return { success: false, message: "Failed to generate authorization code" };
    }
}
