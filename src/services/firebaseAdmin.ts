import fs from 'fs';
import path from 'path';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

let firebaseAdminAuth: Auth | null = null;

function initializeFirebaseAdmin(): Auth | null {
  if (getApps().length > 0) {
    try {
      return getAuth();
    } catch (error: any) {
      console.error('Firebase Admin already initialized but failed to get auth:', error);
      return null;
    }
  }

  const serviceAccountPath = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const fallbackServiceAccountPath = path.resolve(process.cwd(), 'scripts', 'serviceAccountKey.json');

  try {
    if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
      const credentials = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON);
      initializeApp({ credential: cert(credentials) });
      return getAuth();
    }

    if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
      const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      initializeApp({ credential: cert(credentials) });
      return getAuth();
    }

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp();
      return getAuth();
    }

    if (fs.existsSync(fallbackServiceAccountPath)) {
      const credentials = JSON.parse(fs.readFileSync(fallbackServiceAccountPath, 'utf8'));
      initializeApp({ credential: cert(credentials) });
      return getAuth();
    }

    console.warn('Firebase Admin credentials not configured. Set FIREBASE_ADMIN_SERVICE_ACCOUNT_PATH, GOOGLE_APPLICATION_CREDENTIALS, or FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON.');
    return null;
  } catch (error: any) {
    console.error('Failed to initialize Firebase Admin:', error?.message || error);
    return null;
  }
}

firebaseAdminAuth = initializeFirebaseAdmin();

export { firebaseAdminAuth };