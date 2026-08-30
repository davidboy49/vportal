import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { signJwt, getJwtSecret } from "@/lib/jwt";

export async function POST(req: Request) {
    try {
        if (!adminDb) {
            return NextResponse.json(
                { error: "server_error", error_description: "Database not initialized" },
                { status: 500 }
            );
        }

        let body: any = {};
        const contentType = req.headers.get("content-type") || "";

        if (contentType.includes("application/x-www-form-urlencoded")) {
            const formData = await req.formData();
            formData.forEach((value, key) => {
                body[key] = value;
            });
        } else if (contentType.includes("application/json")) {
            body = await req.json();
        } else {
            return NextResponse.json(
                { error: "invalid_request", error_description: "Invalid Content-Type" },
                { status: 400 }
            );
        }

        const { grant_type, code, redirect_uri, client_id, client_secret } = body;

        // 1. Parameter Validation
        if (grant_type !== "authorization_code") {
            return NextResponse.json(
                { error: "unsupported_grant_type", error_description: "grant_type must be 'authorization_code'" },
                { status: 400 }
            );
        }
        if (!code || !redirect_uri || !client_id || !client_secret) {
            return NextResponse.json(
                { error: "invalid_request", error_description: "Missing required parameters" },
                { status: 400 }
            );
        }

        // 2. Fetch Client App by client_id
        const appSnapshot = await adminDb
            .collection("apps")
            .where("clientId", "==", client_id)
            .limit(1)
            .get();

        if (appSnapshot.empty) {
            return NextResponse.json(
                { error: "invalid_client", error_description: "Client application not found" },
                { status: 401 }
            );
        }

        const appDoc = appSnapshot.docs[0];
        const appData = appDoc.data();

        if (!appData.oauthEnabled) {
            return NextResponse.json(
                { error: "invalid_client", error_description: "OAuth 2.0 is disabled for this application" },
                { status: 401 }
            );
        }

        // 3. Verify Client Secret
        if (appData.clientSecret !== client_secret) {
            return NextResponse.json(
                { error: "invalid_client", error_description: "Invalid client credentials" },
                { status: 401 }
            );
        }

        // 4. Retrieve Auth Code
        const codeDocRef = adminDb.collection("oauth_codes").doc(code);
        const codeDoc = await codeDocRef.get();

        if (!codeDoc.exists) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "Invalid or expired authorization code" },
                { status: 400 }
            );
        }

        const codeData = codeDoc.data()!;

        // 5. Deletion/Invalidation immediately to prevent replay attacks
        await codeDocRef.delete();

        // 6. Check Expiration
        if (Date.now() > codeData.expiresAt) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "Authorization code has expired" },
                { status: 400 }
            );
        }

        // 7. Verify Redirect URI matches Callback URI associated with the authorization code
        const cleanReqRedirect = redirect_uri.split("?")[0].split("#")[0].trim().toLowerCase();
        const cleanCodeRedirect = codeData.redirectUri.split("?")[0].split("#")[0].trim().toLowerCase();
        
        if (cleanReqRedirect !== cleanCodeRedirect) {
            return NextResponse.json(
                { error: "invalid_grant", error_description: "Redirect URI mismatch" },
                { status: 400 }
            );
        }

        // 8. Generate standard OIDC Access Token and ID Token
        const jwtSecret = getJwtSecret();
        
        // Custom ID Token Claims containing user identity profile
        const idTokenClaims = {
            sub: codeData.userId,
            email: codeData.email,
            name: codeData.name,
            picture: codeData.photoUrl,
            iss: "vportal",
            aud: client_id,
        };

        // Access Token
        const access_token = signJwt(
            { sub: codeData.userId, client_id, scope: "profile email" },
            jwtSecret,
            3600
        );

        // ID Token (JSON Web Token representation of identity)
        const id_token = signJwt(
            idTokenClaims,
            jwtSecret,
            3600
        );

        return NextResponse.json({
            access_token,
            id_token,
            token_type: "Bearer",
            expires_in: 3600,
        });

    } catch (error) {
        console.error("Token endpoint error:", error);
        return NextResponse.json(
            { error: "server_error", error_description: "An internal server error occurred" },
            { status: 500 }
        );
    }
}
