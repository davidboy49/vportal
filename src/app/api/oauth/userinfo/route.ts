import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { verifyJwt } from "@/lib/jwt";

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "invalid_request", error_description: "Missing Bearer token in Authorization header" },
                { status: 400 }
            );
        }

        const token = authHeader.split("Bearer ")[1].trim();
        const jwtSecret = process.env.JWT_SECRET || "vportal_developer_fallback_jwt_secret_key_change_me_in_production";
        
        const decoded = verifyJwt(token, jwtSecret);
        if (!decoded || !decoded.sub) {
            return NextResponse.json(
                { error: "invalid_token", error_description: "Access token is invalid or has expired" },
                { status: 401 }
            );
        }

        const uid = decoded.sub;

        // Try to fetch latest user profile fields from Firebase Admin Auth
        if (adminAuth) {
            try {
                const userRecord = await adminAuth.getUser(uid);
                return NextResponse.json({
                    sub: uid,
                    email: userRecord.email || null,
                    email_verified: userRecord.emailVerified || false,
                    name: userRecord.displayName || null,
                    picture: userRecord.photoURL || null,
                });
            } catch (err) {
                console.error("Firebase Admin Auth failed to fetch user, falling back", err);
            }
        }

        // Fallback to token decoded claims if Admin Auth fails
        return NextResponse.json({
            sub: uid,
            email: decoded.email || null,
            name: decoded.name || null,
            picture: decoded.picture || null,
        });

    } catch (error) {
        console.error("Userinfo endpoint error:", error);
        return NextResponse.json(
            { error: "server_error", error_description: "An internal server error occurred" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    return GET(req);
}
