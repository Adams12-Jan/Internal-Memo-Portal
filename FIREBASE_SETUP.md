# Firebase Integration Guide for Internal Memo Portal

## Overview
This project has been migrated to Firebase for authentication and Firestore for data storage. This guide helps you set up Firebase, configure your environment, and connect the app.

## Prerequisites
- A Google account
- Access to the [Firebase Console](https://console.firebase.google.com/)
- A browser-based Firebase project

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Create a project**.
3. Enter a project name such as **Internal Memo Portal**.
4. Disable Google Analytics if you do not need it.
5. Click **Create project** and wait until setup completes.

## Step 2: Add a Web App to Firebase

1. In Firebase Console, click the gear icon and open **Project settings**.
2. In **Your apps**, select the Web icon (</>).
3. Register your app with a nickname such as **Memo Portal Web**.
4. Click **Register app**.
5. Copy the Firebase config values.

## Step 3: Configure `.env.local`

Create a `.env.local` file in the project root with the following values:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

> Important: Restart the Vite server after saving `.env.local`.

## Step 4: Enable Firebase Authentication

1. Open **Authentication** in the Firebase Console.
2. Click **Get started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. Optionally enable **Google** or other providers.

## Step 5: Set Up Firestore

1. Open **Firestore Database** in Firebase Console.
2. Click **Create database**.
3. Choose a location near your users.
4. Start in **Production mode**.
5. Click **Enable**.

### Recommended Firestore Rules

In the **Rules** tab, use:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid == userId;
    }

    match /cashAdvances/{docId} {
      allow read, write: if request.auth.uid != null;
    }

    match /retirements/{docId} {
      allow read, write: if request.auth.uid != null;
    }

    match /reports/{docId} {
      allow read, write: if request.auth.uid != null;
    }
  }
}
```

> These rules allow authenticated users to access data while protecting user-specific profile writes.

## Step 6: Set Up Cloud Storage

1. Open **Storage** in Firebase Console.
2. Click **Get started**.
3. Choose a location and click **Done**.

### Recommended Storage Rules

In the **Rules** tab, use:

```firestore
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /profile-pictures/{allPaths=**} {
      allow read: if request.auth.uid != null;
      allow write: if request.auth.uid != null;
    }
  }
}
```

> This rule allows authenticated users to upload and read profile pictures.

## Step 7: Verify the App

1. Run the app:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000/`.
3. Register a new account.
4. Confirm the user appears in Firebase Authentication.
5. Confirm a `users` document is created in Firestore.

## Firestore Data Structure

### `users` collection
```
users/{userId}
  email: string
  first_name: string
  last_name: string
  department: string
  role: string
  profile_picture_url: string
  is_active: boolean
  is_verified: boolean
  created_at: string
```

### Example collections for app data
```
cashAdvances/{docId}
retirements/{docId}
reports/{docId}
```

## Notes

- If Firebase fails to initialize, the app will show a console warning and continue loading mock data.
- Set your env values carefully and restart Vite after editing `.env.local`.
- If you want to use Firebase emulators, set `VITE_USE_FIREBASE_EMULATOR=true` and run the emulator suite.

## Production Deployment Checklist

Follow these steps before you deploy the app to production. These ensure real Firebase is used (not the local mock) and environment variables are configured correctly on your host.

1. Create a production Firebase project (or use the existing one) and register a Web App. Copy the config values.
2. Create a `.env.production` (locally) or set the following environment variables in your hosting provider (Vercel/Netlify/Render/Railway):

```
VITE_FIREBASE_API_KEY=<your_api_key>
VITE_FIREBASE_AUTH_DOMAIN=<your_project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<your_project_id>
VITE_FIREBASE_STORAGE_BUCKET=<your_project>.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=<sender_id>
VITE_FIREBASE_APP_ID=<app_id>
VITE_FIREBASE_MEASUREMENT_ID=<measurement_id>
VITE_USE_FIREBASE_EMULATOR=false
VITE_USE_FIREBASE_MOCK=false
NODE_ENV=production
```

3. DO NOT commit `.env.production` or `.env.local` to Git. Use the hosting platform's dashboard to add the env vars.

4. Build the frontend for production and deploy the generated static assets (Vercel/Netlify will build from your repo):

```bash
npm install
npm run build
```

5. Deploy the backend (`server.ts`) separately if you use a backend service. Ensure the same Firebase service-account (if needed) or backend auth config is available as environment variables on the backend host.

6. Verify after deploy:
- Admin API calls include an `Authorization: Bearer <token>` header. The app stores the Firebase ID token in `localStorage['auth_token']` upon login; confirm backend receives it.
- CMS settings (icon/button colors) persist and the logout/admin buttons reflect the configured `--cms-button-bg` and `--cms-button-text` variables.
- HTTPS is enabled and CORS is configured on your backend to accept requests from your frontend origin.

7. Rollback plan: Keep the previous deploy ready for rollback. If you enabled `VITE_USE_FIREBASE_MOCK` accidentally in production, set it to `false` and redeploy immediately.

If you'd like, I can prepare a short `FIREBASE_SETUP.md` section specifically for configuring Vercel/Netlify/Render with screenshots/examples — tell me which host you'd prefer.

## Troubleshooting

- **Invalid API key**: Confirm `VITE_FIREBASE_API_KEY` is correct.
- **Auth not registered**: Make sure you added a Web app in Firebase.
- **Permission denied**: Check your Firestore and Storage rules.
- **App still white**: Restart the Vite dev server after updating env files.
