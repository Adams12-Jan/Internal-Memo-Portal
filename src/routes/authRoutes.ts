import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { OIDCStrategy as MicrosoftStrategy } from 'passport-azure-ad';
import {
  registerUser,
  loginUser,
  registerOrLoginOAuth,
  generatePasswordResetToken,
  resetPassword,
  generateEmailVerificationToken,
  verifyEmail,
  getUserById,
  getUsers,
  updateUserAccount,
  resetUserPasswordByAdmin,
  verifyToken,
  updateUserProfile
} from '../services/authService';
import { logAuditEvent } from '../services/crmService';

const router = express.Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.SERVER_PORT || 4001}`;

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || `${BACKEND_URL}/api/auth/google/callback`;

const msClientId = process.env.MSAL_CLIENT_ID;
const msClientSecret = process.env.MSAL_CLIENT_SECRET;
const msTenantId = process.env.MSAL_TENANT_ID;
const microsoftCallbackUrl = process.env.MICROSOFT_CALLBACK_URL || `${BACKEND_URL}/api/auth/microsoft/callback`;

// Conditionally register Google strategy only if credentials are provided
if (googleClientId && googleClientId !== 'your_google_client_id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret || '',
        callbackURL: googleCallbackUrl,
        passReqToCallback: false
      },
      (_accessToken, _refreshToken, profile, done) => {
        done(null, profile);
      }
    )
  );
}

// Conditionally register Microsoft strategy only if credentials are provided
if (msClientId && msClientId !== 'your_microsoft_client_id') {
  passport.use(
    new MicrosoftStrategy(
      {
        identityMetadata: `https://login.microsoftonline.com/${msTenantId || 'common'}/v2.0/.well-known/openid-configuration`,
        clientID: msClientId,
        responseType: 'code id_token',
        responseMode: 'query',
        redirectUrl: microsoftCallbackUrl,
        allowHttpForRedirectUrl: true,
        clientSecret: msClientSecret || '',
        scope: ['profile', 'email', 'openid'],
        passReqToCallback: false
      },
      (_iss, _sub, profile, _accessToken, _refreshToken, done) => {
        done(null, profile);
      }
    )
  );
}

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj as any);
});

// Middleware to verify JWT token
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization as string | undefined;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
  const token = tokenFromHeader || (req.headers['x-access-token'] as string | undefined) || (req.query?.token as string | undefined);

  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  (req as any).userId = payload.userId;
  next();
}

// ============ AUTH ROUTES ============

// Register with email/password
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, department } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await registerUser(email, password, firstName, lastName, department);

    // Log audit event
    await logAuditEvent(
      result.user.id,
      'USER_REGISTERED',
      'USER',
      result.user.id,
      null,
      { email, firstName, lastName },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login with email/password
router.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const result = await loginUser(email, password);

    // Log audit event
    await logAuditEvent(
      result.user.id,
      'USER_LOGGED_IN',
      'USER',
      result.user.id,
      null,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

// OAuth login/register
router.post('/auth/oauth', async (req: Request, res: Response) => {
  try {
    const { provider, oauthId, email, firstName, lastName, profilePictureUrl } = req.body;

    if (!provider || !oauthId || !email) {
      return res.status(400).json({ error: 'Missing required OAuth fields' });
    }

    const result = await registerOrLoginOAuth(
      provider,
      oauthId,
      email,
      firstName,
      lastName,
      profilePictureUrl
    );

    // Log audit event
    await logAuditEvent(
      result.user.id,
      `OAUTH_LOGIN_${provider.toUpperCase()}`,
      'USER',
      result.user.id,
      null,
      null,
      req.ip,
      req.get('user-agent')
    );

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// OAuth redirect start
router.get(
  '/auth/google',
  (req: Request, res: Response, next: NextFunction) => {
    if (!googleClientId || !googleClientSecret || googleClientId === 'your_google_client_id') {
      return res.status(501).json({ message: 'Google OAuth is not configured. Please configure Google client credentials or use email/password login.' });
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: `${FRONTEND_URL}/?oauth=failed`, session: false }),
  async (req: Request, res: Response) => {
    const profile = (req as any).user as any;
    if (!profile || !profile.emails?.length) {
      return res.redirect(`${FRONTEND_URL}/?oauth=failed`);
    }

    const email = profile.emails[0].value;
    const oauthId = profile.id;
    const firstName = profile.name?.givenName || email.split('@')[0];
    const lastName = profile.name?.familyName || '';
    const profilePictureUrl = profile.photos?.[0]?.value;

    try {
      const result = await registerOrLoginOAuth('google', oauthId, email, firstName, lastName, profilePictureUrl);
      const token = result.token;
      return res.redirect(`${FRONTEND_URL}/?oauth=success&token=${encodeURIComponent(token)}`);
    } catch (error) {
      return res.redirect(`${FRONTEND_URL}/?oauth=failed`);
    }
  }
);

router.get(
  '/auth/microsoft',
  (req: Request, res: Response, next: NextFunction) => {
    if (!msClientId || !msClientSecret || !msTenantId || msClientId === 'your_microsoft_client_id') {
      return res.status(501).json({ message: 'Microsoft OAuth is not configured. Please configure Azure app credentials or use email/password login.' });
    }
    next();
  },
  passport.authenticate('azuread-openidconnect')
);

router.get(
  '/auth/microsoft/callback',
  passport.authenticate('azuread-openidconnect', { failureRedirect: `${FRONTEND_URL}/?oauth=failed`, session: false }),
  async (req: Request, res: Response) => {
    const profile = (req as any).user as any;
    if (!profile || !profile._json?.email) {
      return res.redirect(`${FRONTEND_URL}/?oauth=failed`);
    }

    const email = profile._json.email;
    const oauthId = profile.oid || profile._json.oid || profile.sub;
    const firstName = profile.name?.givenName || profile._json.given_name || email.split('@')[0];
    const lastName = profile.name?.familyName || profile._json.family_name || '';
    const profilePictureUrl = profile.photos?.[0]?.value || profile._json.picture;

    try {
      const result = await registerOrLoginOAuth('microsoft', oauthId, email, firstName, lastName, profilePictureUrl);
      const token = result.token;
      return res.redirect(`${FRONTEND_URL}/?oauth=success&token=${encodeURIComponent(token)}`);
    } catch (error) {
      return res.redirect(`${FRONTEND_URL}/?oauth=failed`);
    }
  }
);

router.get('/auth/microsoft', (_req: Request, res: Response) => {
  res.status(501).json({
    message: 'Google OAuth is not configured. Please configure Google client credentials or use email/password login.'
  });
});

router.get('/auth/microsoft', (_req: Request, res: Response) => {
  res.status(501).json({
    message: 'Microsoft OAuth is not configured. Please configure Azure app credentials or use email/password login.'
  });
});

// Request password reset
router.post('/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const resetToken = await generatePasswordResetToken(email);

    // In production, send email with reset token
    // For now, just return the token for testing
    res.json({
      message: 'Password reset link sent to email',
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    await resetPassword(token, newPassword);
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Verify email
router.post('/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    await verifyEmail(token);
    res.json({ message: 'Email verified successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get current user
router.get('/auth/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/auth/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, department, profilePictureUrl } = req.body;

    const oldUser = await getUserById(userId);

    const updatedUser = await updateUserProfile(userId, {
      first_name: firstName,
      last_name: lastName,
      department,
      profile_picture_url: profilePictureUrl
    });

    // Log audit event
    await logAuditEvent(
      userId,
      'USER_PROFILE_UPDATED',
      'USER',
      userId,
      oldUser,
      updatedUser,
      req.ip,
      req.get('user-agent')
    );

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// IT Admin: List users
router.get('/auth/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const users = await getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// IT Admin: Update user account state
router.put('/auth/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { firstName, lastName, department, role, profilePictureUrl, isActive, resetPassword } = req.body;

    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const oldUser = { ...targetUser };

    const updatedUser = await updateUserAccount(req.params.id, {
      first_name: firstName,
      last_name: lastName,
      department,
      role,
      profile_picture_url: profilePictureUrl,
      is_active: isActive
    });

    if (resetPassword) {
      await resetUserPasswordByAdmin(req.params.id, resetPassword);
    }

    await logAuditEvent(
      userId,
      'USER_ACCOUNT_UPDATED',
      'USER',
      req.params.id,
      oldUser,
      updatedUser,
      req.ip,
      req.get('user-agent')
    );

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// IT Admin: Disable/enable user account
router.patch('/auth/users/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { isActive } = req.body;

    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const updatedUser = await updateUserAccount(req.params.id, { is_active: !!isActive });

    await logAuditEvent(
      userId,
      `USER_ACCOUNT_${updatedUser.is_active ? 'ENABLED' : 'DISABLED'}`,
      'USER',
      req.params.id,
      targetUser,
      updatedUser,
      req.ip,
      req.get('user-agent')
    );

    res.json(updatedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
