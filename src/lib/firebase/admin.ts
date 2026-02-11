import "server-only";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin
// Note: This requires the FIREBASE_SERVICE_ACCOUNT_KEY environment variable to be set
// with the JSON content of the service account key.
const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

let app;

try {
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error("Missing Firebase Admin environment variables");
    }

    if (getApps().length === 0) {
        app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
        });
    } else {
        app = getApps()[0];
    }
} catch (error) {
    console.error("Firebase Admin initialization error", error);
}

export const adminAuth = app ? getAuth(app) : null;
export const adminDb = app ? getFirestore(app) : null;
