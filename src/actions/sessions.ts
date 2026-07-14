"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import { headers } from "next/headers";

function isPrivateIp(ip: string): boolean {
    if (!ip) return true;
    const cleanIp = ip.split(",")[0].trim();
    if (cleanIp === "127.0.0.1" || cleanIp === "::1" || cleanIp === "localhost") return true;
    if (cleanIp.startsWith("10.")) return true;
    if (cleanIp.startsWith("192.168.")) return true;
    if (cleanIp.startsWith("172.")) {
        const parts = cleanIp.split(".");
        if (parts.length >= 2) {
            const second = parseInt(parts[1], 10);
            if (second >= 16 && second <= 31) return true;
        }
    }
    return false;
}

export async function recordSession(idToken: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Not authenticated" };
        }

        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        const headersList = await headers();
        const userAgent = headersList.get("user-agent") || "Unknown";
        
        // Get IP Address (prioritizing Cloudflare client IP headers)
        const cfConnectingIp = headersList.get("cf-connecting-ip");
        const trueClientIp = headersList.get("true-client-ip");
        const forwardedFor = headersList.get("x-forwarded-for");
        const realIp = headersList.get("x-real-ip");
        
        let ip = "127.0.0.1";
        if (cfConnectingIp) {
            ip = cfConnectingIp.trim();
        } else if (trueClientIp) {
            ip = trueClientIp.trim();
        } else if (forwardedFor) {
            ip = forwardedFor.split(",")[0].trim();
        } else if (realIp) {
            ip = realIp.trim();
        }

        // Get Geo Location
        let geo = "Unknown";
        if (ip && !isPrivateIp(ip)) {
            try {
                const res = await fetch(`http://ip-api.com/json/${ip}`, { signal: AbortSignal.timeout(3000) });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.status === "success") {
                        geo = [data.city, data.regionName, data.countryCode].filter(Boolean).join(", ");
                    }
                }
            } catch (e) {
                console.error("Geo IP lookup failed:", e);
            }
        } else if (isPrivateIp(ip)) {
            geo = "Local Development";
        }

        const sessionRef = adminDb.collection("sessions").doc();
        const sessionData = {
            id: sessionRef.id,
            uid: user.uid,
            email: user.email || "anonymous",
            displayName: user.name || user.email?.split("@")[0] || "User",
            ip,
            geo,
            userAgent,
            createdAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            status: "active",
        };

        await sessionRef.set(sessionData);

        return { success: true, sessionId: sessionRef.id };
    } catch (error) {
        console.error("Error in recordSession Server Action:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to record session" };
    }
}

export async function pingSession(idToken: string, sessionId: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Not authenticated" };
        }

        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        const sessionRef = adminDb.collection("sessions").doc(sessionId);
        const doc = await sessionRef.get();

        if (!doc.exists) {
            return { success: true, terminated: true };
        }

        const sessionData = doc.data();
        if (!sessionData) {
            return { success: true, terminated: true };
        }

        if (sessionData.uid !== user.uid) {
            return { success: false, message: "Unauthorized session check" };
        }

        if (sessionData.status === "terminated") {
            return { success: true, terminated: true };
        }

        // Update last active
        await sessionRef.update({
            lastActive: new Date().toISOString(),
        });

        return { success: true, terminated: false };
    } catch (error) {
        console.error("Error in pingSession Server Action:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to ping session" };
    }
}

export async function getSessions(idToken: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user || user.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" };
        }

        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        const snapshot = await adminDb.collection("sessions")
            .orderBy("lastActive", "desc")
            .limit(100)
            .get();

        const sessions = snapshot.docs.map((doc) => doc.data());

        return { success: true, sessions };
    } catch (error) {
        console.error("Error in getSessions Server Action:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to fetch sessions" };
    }
}

export async function terminateSession(idToken: string, sessionId: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user || user.role !== "ADMIN") {
            return { success: false, message: "Unauthorized: Admin access required" };
        }

        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        await adminDb.collection("sessions").doc(sessionId).update({
            status: "terminated",
        });

        return { success: true };
    } catch (error) {
        console.error("Error in terminateSession Server Action:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to terminate session" };
    }
}

export async function terminateSessionByUser(idToken: string, sessionId: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Not authenticated" };
        }

        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        const sessionRef = adminDb.collection("sessions").doc(sessionId);
        const doc = await sessionRef.get();

        if (doc.exists) {
            const data = doc.data();
            if (data && data.uid === user.uid) {
                await sessionRef.update({
                    status: "terminated",
                });
            }
        }

        return { success: true };
    } catch (error) {
        console.error("Error in terminateSessionByUser Server Action:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to terminate session" };
    }
}
