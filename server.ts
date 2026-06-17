import express from 'express';
import cors from 'cors';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import dotenv from 'dotenv';
import passport from 'passport';
import authRoutes from './src/routes/authRoutes';
import crmRoutes from './src/routes/crmRoutes';
import { initializeDatabase } from './src/db/db';

dotenv.config();

const app = express();
const port = Number(process.env.SERVER_PORT || process.env.PORT || 4000);
const uploadsDir = path.resolve(process.cwd(), 'uploads');

// Initialize database on startup
(async () => {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error('Database initialization error:', error);
    // Continue anyway - database might already be initialized
  }
})();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    fs.mkdir(uploadsDir, { recursive: true })
      .then(() => cb(null, uploadsDir))
      .catch(error => cb(error as Error, uploadsDir));
  },
  filename(_req, file, cb) {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());
app.use('/uploads', express.static(uploadsDir));

const getHostUrl = (req: express.Request) => {
  const host = req.get('host') || `localhost:${port}`;
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}`;
};

const getAppAccessToken = async (): Promise<string | null> => {
  const tenant = process.env.MSAL_TENANT_ID;
  const clientId = process.env.MSAL_CLIENT_ID;
  const clientSecret = process.env.MSAL_CLIENT_SECRET;

  if (!tenant || !clientId || !clientSecret) {
    return null;
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params.toString()
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  return data.access_token || null;
};

const buildGraphUploadUrl = (destination: string, fileName: string): string | null => {
  const encodedName = encodeURIComponent(fileName);
  if (destination === 'sharepoint') {
    const siteId = process.env.SHAREPOINT_SITE_ID;
    if (!siteId) return null;
    return `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drive/root:/${encodedName}:/content`;
  }

  if (destination === 'onedrive') {
    const driveId = process.env.ONEDRIVE_DRIVE_ID;
    if (!driveId) return null;
    return `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodedName}:/content`;
  }

  return null;
};

app.get('/', (_req, res) => {
  res.send(`Internal Memo Portal API is running. Use /api/status for health checks.`);
});

app.get('/api/status', (_req, res) => {
  const isGoogleConfigured = Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id'
  );
  const isMicrosoftConfigured = Boolean(
    process.env.MSAL_CLIENT_ID &&
    process.env.MSAL_CLIENT_SECRET &&
    process.env.MSAL_TENANT_ID &&
    process.env.MSAL_CLIENT_ID !== 'your_microsoft_client_id'
  );
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    configuredMicrosoft: isMicrosoftConfigured,
    configuredGoogle: isGoogleConfigured
  });
});

app.post('/api/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file upload' });
  }

  const downloadUrl = `${getHostUrl(req)}/uploads/${encodeURIComponent(req.file.filename)}`;
  return res.json({
    id: req.file.filename,
    name: req.file.originalname,
    size: req.file.size,
    storedPath: req.file.path,
    fileUrl: downloadUrl,
    downloadUrl
  });
});

app.post('/api/microsoft/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file upload' });
  }

  const destination = (req.body?.destination || 'onedrive') as string;
  const localDownloadUrl = `${getHostUrl(req)}/uploads/${encodeURIComponent(req.file.filename)}`;
  const fileBuffer = await fs.readFile(req.file.path);
  const graphUrl = buildGraphUploadUrl(destination, req.file.originalname);
  let shareUrl = '';
  let message = `File saved locally at ${localDownloadUrl}.`;

  const accessToken = await getAppAccessToken();
  if (accessToken && graphUrl) {
    const graphResponse = await fetch(graphUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream'
      },
      body: fileBuffer
    });

    if (graphResponse.ok) {
      const graphData = await graphResponse.json();
      shareUrl = graphData['webUrl'] || graphData['@microsoft.graph.downloadUrl'] || '';
      message = `Uploaded to Microsoft Graph ${destination}.`;
    } else {
      const errorText = await graphResponse.text();
      message = `Uploaded locally, but Microsoft Graph upload failed: ${errorText}`;
    }
  } else {
    message = 'File stored locally. Microsoft Graph upload requires MSAL configuration in environment variables.';
  }

  return res.json({
    destination,
    fileName: req.file.originalname,
    fileUrl: localDownloadUrl,
    shareUrl,
    message
  });
});

app.post('/api/microsoft/sign', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file upload' });
  }

  const signerName = req.body?.signerName || 'Unknown Signer';
  const signedName = `signed-${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const signedPath = path.join(uploadsDir, signedName);

  await fs.copyFile(req.file.path, signedPath);

  const signedUrl = `${getHostUrl(req)}/uploads/${encodeURIComponent(signedName)}`;
  return res.json({
    signedUrl,
    message: `Document signed by ${signerName} and stored for review.`
  });
});

// Register authentication and CRM routes under /api so Vite proxy and frontend API base align.
app.use('/api', authRoutes);
app.use('/api', crmRoutes);

app.listen(port, () => {
  console.log(`Internal Memo Portal API server running on http://localhost:${port}`);
});
