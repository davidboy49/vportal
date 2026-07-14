"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { verifyIdToken } from "@/lib/auth";
import crypto from "crypto";

/**
 * Sets a 4-digit login PIN for the authenticated user.
 */
export async function setUserPin(idToken: string, pin: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Not authenticated" };
        }
        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, message: "PIN must be exactly 4 digits" };
        }

        const salt = crypto.randomBytes(16).toString("hex");
        const hash = crypto.pbkdf2Sync(pin, salt, 1000, 64, "sha512").toString("hex");
        console.log(salt, hash);
        await adminDb.collection("users").doc(user.uid).set({
            pinHash: hash,
            pinSalt: salt,
            pinEnabled: true,
            pinAttempts: 0,
            pinLockedUntil: null
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error setting PIN:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to set PIN" };
    }
}

/**
 * Disables and removes the login PIN for the authenticated user.
 */
export async function removeUserPin(idToken: string) {
    try {
        const user = await verifyIdToken(idToken);
        if (!user) {
            return { success: false, message: "Not authenticated" };
        }
        if (!adminDb) {
            return { success: false, message: "Database not initialized" };
        }

        await adminDb.collection("users").doc(user.uid).set({
            pinHash: null,
            pinSalt: null,
            pinEnabled: false,
            pinAttempts: 0,
            pinLockedUntil: null
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error removing PIN:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to remove PIN" };
    }
}

/**
 * Checks if a user (by UID) has a login PIN configured.
 */
export async function checkUserPinStatus(uid: string) {
    try {
        if (!adminDb) {
            return { success: false, pinEnabled: false };
        }
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return { success: true, pinEnabled: false };
        }
        const data = userDoc.data();
        return { success: true, pinEnabled: !!data?.pinEnabled };
    } catch (error) {
        console.error("Error checking PIN status:", error);
        return { success: false, pinEnabled: false };
    }
}

/**
 * Verifies a user's PIN and creates a Custom Auth Token if correct.
 * Implements 5-attempt brute-force protection with 15-minute lockouts.
 */
export async function verifyPinAndCreateToken(uid: string, pin: string) {
    try {
        if (!adminDb || !adminAuth) {
            return { success: false, message: "Firebase Admin not initialized" };
        }
        if (!/^\d{4}$/.test(pin)) {
            return { success: false, message: "PIN must be exactly 4 digits" };
        }

        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return { success: false, message: "User not found" };
        }

        const data = userDoc.data();
        if (!data?.pinEnabled || !data?.pinHash || !data?.pinSalt) {
            return { success: false, message: "PIN is not enabled for this user" };
        }

        // Check if user is locked out
        if (data.pinLockedUntil) {
            const lockTime = new Date(data.pinLockedUntil).getTime();
            const now = Date.now();
            if (now < lockTime) {
                const minutesLeft = Math.ceil((lockTime - now) / 60000);
                return { 
                    success: false, 
                    message: `Too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.` 
                };
            }
        }

        const computedHash = crypto.pbkdf2Sync(pin, data.pinSalt, 1000, 64, "sha512").toString("hex");

        if (computedHash === data.pinHash) {
            // PIN is correct: reset attempts and create custom token
            await adminDb.collection("users").doc(uid).set({
                pinAttempts: 0,
                pinLockedUntil: null
            }, { merge: true });

            const customToken = await adminAuth.createCustomToken(uid);
            return { success: true, customToken };
        } else {
            // PIN is incorrect: increment attempts
            const currentAttempts = (data.pinAttempts || 0) + 1;
            let pinLockedUntil = null;
            let message = `Incorrect PIN. ${5 - currentAttempts} attempts remaining.`;

            if (currentAttempts >= 5) {
                const lockDuration = 15 * 60 * 1000; // 15 minutes
                pinLockedUntil = new Date(Date.now() + lockDuration).toISOString();
                message = "Too many failed attempts. Account locked for 15 minutes.";
            }

            await adminDb.collection("users").doc(uid).set({
                pinAttempts: currentAttempts,
                pinLockedUntil
            }, { merge: true });

            return { success: false, message };
        }
    } catch (error) {
        console.error("Error verifying PIN:", error);
        return { success: false, message: error instanceof Error ? error.message : "Failed to verify PIN" };
    }
}
