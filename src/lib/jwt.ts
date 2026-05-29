import crypto from "crypto";

function base64UrlEncode(str: string | Buffer): string {
    const buffer = typeof str === "string" ? Buffer.from(str) : str;
    return buffer.toString("base64")
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

/**
 * Sign a JSON payload using HMAC SHA-256 (HS256)
 */
export function signJwt(payload: object, secret: string, expiresInSeconds: number = 3600): string {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const fullPayload = {
        ...payload,
        iat: now,
        exp: now + expiresInSeconds
    };
    
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac("sha256", secret)
        .update(signatureInput)
        .digest();
        
    const encodedSignature = base64UrlEncode(signature);
    return `${signatureInput}.${encodedSignature}`;
}

/**
 * Verify a signed HS256 JWT and return its payload if valid
 */
export function verifyJwt(token: string, secret: string): any {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = base64UrlEncode(
        crypto.createHmac("sha256", secret).update(signatureInput).digest()
    );
    
    if (encodedSignature !== expectedSignature) {
        return null; // signature mismatch
    }
    
    try {
        const payloadStr = Buffer.from(encodedPayload, "base64").toString("utf-8");
        const payload = JSON.parse(payloadStr);
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && now > payload.exp) {
            return null; // expired
        }
        return payload;
    } catch {
        return null;
    }
}
