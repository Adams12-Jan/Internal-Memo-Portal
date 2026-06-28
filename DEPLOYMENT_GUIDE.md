# Deploy to Render + Vercel

This guide walks you through deploying your app: **Render backend + Vercel frontend**.

## Step 1: Prepare Your Local Environment

```bash
# 1. Update your .env.local with all required variables
# Copy from .env.render.example and .env.vercel.example, fill in your actual values

# 2. Test locally
npm run dev        # In one terminal
npm run start      # In another terminal

# Verify login works: http://localhost:3000
```

## Step 2: Push to GitHub

```bash
git add .
git commit -m "Fix: Configure Render backend + Vercel frontend"
git push origin main
```

## Step 3: Deploy Backend to Render

### Option A: Automatic (Recommended)
1. Go to https://render.com and sign in
2. Connect your GitHub repo if not already done
3. Create a new Web Service:
   - **Name**: `internal-memo-api`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Plan**: Free (or Starter)
   - **Region**: `oregon` (or nearest to you)

4. Render will auto-read `render.yaml` and apply settings

### Option B: Manual via Render Dashboard
- Go to Web Services → Create New → Connect GitHub
- Select this repo
- Fill in the same settings above
- Click Deploy

### After Initial Deploy:
1. Wait for build to complete (~2-3 min)
2. Note your Render service URL: `https://internal-memo-api.onrender.com` (or similar)
3. Test health check:
   ```bash
   curl https://internal-memo-api.onrender.com/api/status
   # Should return: {"status":"ok","timestamp":"2026-06-28..."}
   ```

## Step 4: Set Render Environment Variables

1. In Render Dashboard → Services → `internal-memo-api`
2. Go to **Environment** tab
3. Add environment variables from `.env.render.example`:

**Critical ones:**
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A random secure string
- `NODE_ENV` = `production`
- `CORS_ORIGIN` = Your Vercel domain (set this AFTER Vercel deploy)
- `MSAL_CLIENT_ID`, `MSAL_CLIENT_SECRET`, `MSAL_TENANT_ID`

**How to add:**
- Add variable key → paste value → Save changes
- Render will auto-redeploy after env changes

## Step 5: Deploy Frontend to Vercel

1. Go to https://vercel.com and sign in
2. Click **Add New** → **Project**
3. Select your GitHub repo
4. Framework: Auto-detect (or select `Vite`)
5. Build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Click **Deploy**

### After Deploy:
- Note your Vercel URL: `https://your-project.vercel.app`
- Update `CORS_ORIGIN` on Render to this URL

## Step 6: Set Vercel Environment Variables

1. In Vercel Dashboard → Settings → Environment Variables
2. Add variables from `.env.vercel.example`:

**Critical ones:**
- `VITE_API_URL` = `https://internal-memo-api.onrender.com` (your Render URL)
- `VITE_FIREBASE_*` - All Firebase config keys
- `VITE_USE_FIREBASE_EMULATOR` = `false`
- `VITE_USE_FIREBASE_MOCK` = `false`
- `NODE_ENV` = `production`

3. After adding variables, go to **Deployments** and click **Redeploy**

## Step 7: Verify Everything

### Backend Health
```bash
curl https://internal-memo-api.onrender.com/api/status
```

### Frontend
1. Open your Vercel URL in browser
2. Try to log in - should **NOT** get 405 error
3. Check browser console for any errors
4. Test file uploads if available

## Troubleshooting

### 405 Error Still Appears
- ✓ Check `VITE_API_URL` is set correctly in Vercel
- ✓ Check `CORS_ORIGIN` is set correctly in Render
- ✓ Verify Render backend is running: curl the `/api/status` endpoint
- ✓ Clear browser cache and redeploy

### Render Build Fails
- Check Render build logs (Logs tab)
- Common issues:
  - Missing `npm install` in Build Command
  - Missing environment variables
  - Database connection issues

### Login Still Doesn't Work
- Open browser DevTools → Network tab
- Try to log in
- Check the request to `/api/auth/login` (or `/auth/login`)
- Look at response - if it's empty or 405, Render backend isn't responding
- If you see CORS error, update `CORS_ORIGIN` on Render

## Quick Reference

| Component | URL | Status Check |
|-----------|-----|---|
| **Backend (Render)** | `https://internal-memo-api.onrender.com` | `curl .../api/status` |
| **Frontend (Vercel)** | `https://your-project.vercel.app` | Open in browser |
| **Database** | Connection via `DATABASE_URL` env var | Run migrations if needed |

## Environment Variables Sync

If you need to update multiple env vars at once:

### Render (PowerShell)
```powershell
# First, get your Render API key from Settings → API Key
$env:RENDER_API_KEY = 'rnd_xxxx'
$env:RENDER_SERVICE_ID = 'srv_xxxx'  # Get from Render service URL
npm run render:sync-env -- .env.render
```

### Vercel (PowerShell)
```powershell
# Get token from Vercel Settings → Tokens
$env:VERCEL_TOKEN = 'xxxx'
npm run vercel:sync-env -- .env.vercel
```

## Next Steps

After successful deployment:
1. Monitor Render and Vercel logs for errors
2. Set up error tracking (e.g., Sentry)
3. Configure database backups
4. Set up CI/CD for auto-deployments on git push
