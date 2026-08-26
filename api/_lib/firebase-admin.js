import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getAdminApp() {
  if (getApps().length) return getApps()[0];

  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!process.env.FCM_PROJECT_ID || !process.env.FCM_CLIENT_EMAIL || !privateKey) {
    const error = new Error("Firebase Admin credentials are not configured.");
    error.status = 500;
    throw error;
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FCM_PROJECT_ID,
      clientEmail: process.env.FCM_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export async function verifyFirebaseToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    const error = new Error("Missing Firebase ID token.");
    error.status = 401;
    throw error;
  }
  return getAuth(getAdminApp()).verifyIdToken(header.slice(7));
}

export { getAdminApp };
