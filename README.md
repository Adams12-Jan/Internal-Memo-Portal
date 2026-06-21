<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/3dfb587d-828d-4676-978d-133f005ee79b

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Create a `.env.local` file and set the Firebase variables from `FIREBASE_SETUP.md`.
3. Run the app:
   `npm run dev`

## Vercel Deployment

1. In the Vercel dashboard, add these environment variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MEASUREMENT_ID`
   - `VITE_USE_FIREBASE_EMULATOR=false`
   - `VITE_USE_FIREBASE_MOCK=false`
   - `NODE_ENV=production`
   - `VITE_API_URL=https://<your-render-service>.onrender.com`

3. To sync Vercel env vars from a local env file, use the helper script:
   ```powershell
   $env:VERCEL_TOKEN = '<your-vercel-token>'
   $env:PROJECT_ID = '<your-vercel-project-id>'
   npm run vercel:sync-env -- .env.local --trigger-deployment
   ```

4. Build command:
   `npm run build`
5. Output directory:
   `dist`

> Note: This repo currently builds a static frontend. The backend API is deployed separately (for example, to Render), and the frontend reads it from `VITE_API_URL`.
