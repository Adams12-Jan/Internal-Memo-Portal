Render deployment steps

1. Create a Render account (https://render.com) and connect your GitHub repository.

2. Create a new Web Service:
   - Service: Web Service
   - Name: internal-memo-api
   - Environment: Node
   - Branch: main
   - Build Command: `npm install`
   - Start Command: `npm run start`
   - Plan: Free (or select appropriate plan)
   - Region: Choose nearest (e.g., Oregon)

3. Render will read `render.yaml` and apply the manifest. If you prefer the UI, set the same fields there.

4. Add environment variables in Render Dashboard → Environment:
   - Copy values from your local `.env.local` or secure store. Important vars include:
     - `SERVER_PORT` (optional)
     - `DATABASE_URL` or DB specific vars (DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME)
     - `JWT_SECRET`
     - `MSAL_CLIENT_ID`, `MSAL_CLIENT_SECRET`, `MSAL_TENANT_ID`
     - `SHAREPOINT_SITE_ID`, `ONEDRIVE_DRIVE_ID`
     - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`
     - `FRONTEND_URL` = https://<your-vercel-domain>

5. Deploy. After build completes, note the service URL (e.g., `https://internal-memo-api.onrender.com`).

6. To sync Render env vars from `.env.render`, run either:
   ```powershell
   $env:RENDER_API_KEY = '<your-render-api-key>'
   $env:RENDER_SERVICE_NAME = 'internal-memo-api'
   npm run render:sync-env -- .env.render
   ```
   or, if you prefer to keep the Render key in a file, add `RENDER_API_KEY` and `RENDER_SERVICE_NAME` to `.env.render` and run:
   ```powershell
   npm run render:sync-env -- .env.render --render-api-key-file .env.render
   ```
   To trigger a Render deploy immediately after env sync, add `-- --trigger-deploy`:
   ```powershell
   npm run render:sync-env -- .env.render --trigger-deploy
   ```

7. In Vercel, add the production frontend env vars from your local `.env.local` or `.env.production.example`:
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

8. To sync Vercel env vars from a local env file:
   ```powershell
   $env:VERCEL_TOKEN = '<your-vercel-token>'
   $env:PROJECT_ID = '<your-vercel-project-id>'
   npm run vercel:sync-env -- .env.local --trigger-deployment
   ```

9. Verify:
   - Health check: `curl https://<render-url>/api/status`
   - Frontend: open your Vercel URL and test login / upload flows.

Notes:
- The server uses `tsx` to run `server.ts` directly. `tsx` is installed as a dependency so Render will install it.
- If you prefer building a compiled JS server, change `startCommand` to `node ./dist/server.js` and add a build step to transpile TypeScript.
