import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const prompt = searchParams.get("prompt");

    const issuer = process.env.KEYCLOAK_ISSUER;
    const clientId = process.env.KEYCLOAK_CLIENT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${appUrl}/api/auth/keycloak/callback`;

    if (!issuer || !clientId) {
        console.error("Missing Keycloak issuer or client ID configuration");
        return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent("Keycloak integration is misconfigured.")}`);
    }

    // Standard OIDC authorization request parameters
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile email",
    });

    if (prompt) {
        params.set("prompt", prompt);
    }

    const authUrl = `${issuer}/protocol/openid-connect/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);
}
