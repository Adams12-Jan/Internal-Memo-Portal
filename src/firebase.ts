import { initializeApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// Get Firebase config from environment variables
// Instructions: Get these values from Firebase Console
// https://console.firebase.google.com/ → Project Settings → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Check if Firebase is properly configured
const isConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);

let app: any = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (isConfigured) {
  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    // Log minimal, safe info about the initialized project (redact API key)
    const safeApiKey = firebaseConfig.apiKey ? `****${firebaseConfig.apiKey.slice(-4)}` : '(missing)';
    console.log('Firebase initialized:', {
      projectId: firebaseConfig.projectId,
      appId: firebaseConfig.appId,
      authDomain: firebaseConfig.authDomain,
      apiKey: safeApiKey
    });
    
    // Get Firebase services
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);
    
    // Use emulators in development if VITE_USE_FIREBASE_EMULATOR is set
    if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('Firebase emulators connected');
      } catch (error) {
        // Emulators might already be connected
        console.log('Firebase emulators already connected or unavailable');
      }
    }
  } catch (error) {
    console.error('Firebase initialization error:', (error as any)?.code || '', (error as any)?.message || '', error);
    app = null;
    auth = null;
    firestore = null;
    storage = null;
  }
} else {
  console.warn('Firebase is not configured. Please set environment variables in .env.local');
  console.warn('See FIREBASE_SETUP.md for instructions.');
}

export { auth, firestore, storage, isConfigured };
export default app;
