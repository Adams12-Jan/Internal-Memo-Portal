/**
 * Script: create_firebase_admin.ts
 * Purpose: Create a Firebase Auth user and seed a Firestore `users` document
 * Usage:
 * 1. Download a Firebase service account JSON and save as `scripts/serviceAccountKey.json`.
 * 2. Install dependency: `npm install firebase-admin` (or `yarn add firebase-admin`).
 * 3. Run: `npx tsx scripts/create_firebase_admin.ts` or `node -r ts-node/register scripts/create_firebase_admin.ts`
 *
 * Environment vars (optional):
 * - ADMIN_EMAIL (default: it.admin@example.com)
 * - ADMIN_PASSWORD (default: ChangeMe123!)
 * - ADMIN_FIRST_NAME (default: IT)
 * - ADMIN_LAST_NAME (default: Admin)
 * - ADMIN_DEPARTMENT (default: IT & Systems)
 */

import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';

async function main() {
  const serviceAccountPath = path.join(process.cwd(), 'scripts', 'serviceAccountKey.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('Service account JSON not found at', serviceAccountPath);
    console.error('Download from Firebase Console > Project Settings > Service accounts and save as scripts/serviceAccountKey.json');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });

  const auth = admin.auth();
  const db = admin.firestore();

  const email = process.env.ADMIN_EMAIL || 'it.admin@example.com';
  const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const firstName = process.env.ADMIN_FIRST_NAME || 'IT';
  const lastName = process.env.ADMIN_LAST_NAME || 'Admin';
  const department = process.env.ADMIN_DEPARTMENT || 'IT & Systems';

  try {
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log('User already exists in Firebase Auth:', userRecord.uid);
      // Optionally update password
      await auth.updateUser(userRecord.uid, { password });
      console.log('Updated password for existing user');
    } catch (err: any) {
      if (err.code && err.code === 'auth/user-not-found') {
        userRecord = await auth.createUser({ email, password, displayName: `${firstName} ${lastName}`, emailVerified: true });
        console.log('Created Firebase Auth user:', userRecord.uid);
      } else {
        throw err;
      }
    }

    // Set custom claims to reflect admin role
    await auth.setCustomUserClaims(userRecord.uid, { role: 'System Administrator' });
    console.log('Set custom claims for user');

    // Seed Firestore users collection
    const userDoc = db.collection('users').doc(userRecord.uid);
    const now = new Date().toISOString();
    const userData = {
      email,
      first_name: firstName,
      last_name: lastName,
      department,
      portal_identity: 'it_admin',
      role: 'System Administrator',
      profile_picture_url: null,
      is_active: true,
      is_verified: true,
      created_at: now
    } as any;

    await userDoc.set(userData, { merge: true });
    console.log('Seeded Firestore users/', userRecord.uid);

    console.log('SUCCESS: Firebase admin user is ready. UID:', userRecord.uid);
    console.log('Login with:', email, '/', password);
  } catch (e: any) {
    console.error('Error creating Firebase admin user:', e);
    process.exit(1);
  }
}

main();
