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

### 405 Error (Method Not Allowed)

A 405 error means the backend received a request but the HTTP method (GET/POST/etc.) doesn't match what the endpoint expects.

#### Likely Causes

1. **Frontend requesting wrong endpoint**
   - Check `src/services/authClient.ts` - verify it's POST-ing to `/api/auth/login` (not GET)
   - Check `src/services/cmsClient.ts` - verify HTTP methods match backend routes

2. **API URL not configured**
   - Vercel doesn't see `VITE_API_URL` → Frontend sends requests to `/api` → Static server returns 405
   - **Solution**: Add `VITE_API_URL=https://internal-memo-api.onrender.com` to Vercel env vars

3. **Backend not running on Render**
   - Frontend tries to reach Render URL but backend failed to start
   - **Debug**: `curl https://internal-memo-api.onrender.com/api/status`
   - Check Render build logs if status returns 404/500

4. **CORS mismatch**
   - Frontend URL not in Render's `CORS_ORIGIN`
   - **Solution**: Set `CORS_ORIGIN=https://your-vercel-domain.vercel.app` on Render

#### How to Diagnose

**Option 1: Automated Diagnostic Script**

Run the diagnostic script to test your configuration:

```powershell
# Windows PowerShell
./scripts/diagnose-405.ps1
```

Or bash (Linux/Mac):
```bash
chmod +x ./scripts/diagnose-405.sh
./scripts/diagnose-405.sh
```

This will test:
- ✓ Backend is running
- ✓ Login endpoint responds correctly
- ✓ CORS headers are configured
- ✓ Frontend can reach backend

**Option 2: Manual Debugging in Browser**

```
1. Open DevTools (F12)
2. Go to Network tab
3. Clear existing requests
4. Try to log in
5. Find the POST request to /api/auth/login
6. Check:
   - Status code (405 = method mismatch, 404 = route not found, 500 = server error)
   - Request URL (should be https://internal-memo-api.onrender.com/api/auth/login)
   - Response headers (look for CORS errors)
   - If request URL shows /api/auth/login (not absolute URL), VITE_API_URL is not set
```

#### Quick Fixes

- ✓ Check `VITE_API_URL` is set correctly in Vercel
- ✓ Check `CORS_ORIGIN` is set correctly in Render
- ✓ Verify Render backend is running: `curl https://internal-memo-api.onrender.com/api/status`
- ✓ Clear browser cache: DevTools → Network → Disable cache, hard refresh (Ctrl+Shift+R)
- ✓ Redeploy Vercel after changing env vars: Deployments → Redeploy

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

## API Endpoints Reference

These endpoints are available on your Render backend:

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/status` | GET | Health check | No |
| `/api/auth/login` | POST | Log in with email/password | No |
| `/api/auth/register` | POST | Create new account | No |
| `/api/auth/forgot-password` | POST | Request password reset | No |
| `/api/auth/reset-password` | POST | Reset password with token | No |
| `/api/auth/verify-email` | POST | Verify email address | No |
| `/api/auth/me` | GET | Get current user info | Yes |
| `/api/auth/debug` | GET | Debug auth tokens | No |

**Expected HTTP Status Codes:**
- `200` - Success (GET)
- `201` - Created (POST)
- `400` - Bad request (missing fields)
- `401` - Unauthorized (invalid credentials)
- `403` - Forbidden (invalid token)
- `404` - Not found (wrong URL)
- `405` - Method not allowed (using GET instead of POST)
- `500` - Server error (check Render logs)

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
