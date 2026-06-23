import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  registerUser,
  loginUser,
  generatePasswordResetToken,
  resetPassword,
  generateEmailVerificationToken,
  verifyEmail,
  getUserById,
  getUsers,
  createUserAccount,
  deleteUserAccount,
  updateUserAccount,
  clearUserProfile,
  resetUserPasswordByAdmin,
  verifyToken,
  updateUserProfile
} from '../services/authService';
import { logAuditEvent } from '../services/cmsService';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only accept image files
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Only image files are allowed'));
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter
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
router.post('/auth/register', upload.single('profilePicture'), async (req: Request, res: Response) => {
  try {
    // Debug logging
    console.log('Register request received');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file ? { filename: req.file.filename, size: req.file.size, mimetype: req.file.mimetype } : 'none');
    
    const { email, password, firstName, lastName, department } = req.body;

    if (!email || !password || !firstName || !lastName) {
      // Clean up uploaded file if validation fails
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      console.log('Missing required fields:', { email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate profile picture URL if file was uploaded
    let profilePictureUrl = null;
    if (req.file) {
      profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;
    }

    const result = await registerUser(email, password, firstName, lastName, department, profilePictureUrl);

    // Log audit event
    await logAuditEvent(
      result.user.id,
      'USER_REGISTERED',
      'USER',
      result.user.id,
      null,
      { email, firstName, lastName, hasProfilePicture: !!profilePictureUrl },
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(result);
  } catch (error: any) {
    // Clean up uploaded file if registration fails
    if ((req as any).file) {
      fs.unlink((req as any).file.path, () => {});
    }
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

// Internal one-time bootstrap endpoint to create the first System Administrator.
// Protect with INIT_BOOTSTRAP_SECRET env var and only allow when no users exist.
router.post('/internal/bootstrap-admin', async (req: Request, res: Response) => {
  try {
    const providedSecret = (req.headers['x-bootstrap-secret'] as string) || (req.query?.secret as string) || '';
    const configured = process.env.INIT_BOOTSTRAP_SECRET;
    if (!configured) {
      return res.status(403).json({ error: 'Bootstrap secret not configured on server' });
    }

    if (!providedSecret || providedSecret !== configured) {
      return res.status(403).json({ error: 'Invalid bootstrap secret' });
    }

    // Ensure this is only used when there are no users in the system
    const countResult = await (await import('../db/db')).query('SELECT COUNT(*) FROM users');
    const count = Number(countResult.rows[0]?.count || 0);
    if (count > 0) {
      return res.status(400).json({ error: 'Bootstrap not allowed: users already exist' });
    }

    const { email, password, firstName, lastName, department } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Missing required fields: email, password, firstName, lastName' });
    }

    const result = await registerUser(email, password, firstName, lastName, department || 'IT & Systems', null);
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Bootstrap admin error:', error);
    return res.status(500).json({ error: error?.message || String(error) });
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

// IT Admin: Create new user account
router.post('/auth/users', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { email, password, firstName, lastName, department, role, profilePictureUrl, isActive } = req.body;

    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'Email, password, first name, last name and role are required' });
    }

    const newUser = await createUserAccount(
      email,
      password,
      firstName,
      lastName,
      department || 'Administration',
      role,
      profilePictureUrl || null,
      isActive !== undefined ? !!isActive : true
    );

    await logAuditEvent(
      userId,
      'USER_ACCOUNT_CREATED',
      'USER',
      newUser.id,
      null,
      newUser,
      req.ip,
      req.get('user-agent')
    );

    res.status(201).json(newUser);
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

// IT Admin: Delete user account
router.delete('/auth/users/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const deletedUser = await deleteUserAccount(req.params.id);

    await logAuditEvent(
      userId,
      'USER_ACCOUNT_DELETED',
      'USER',
      req.params.id,
      targetUser,
      deletedUser,
      req.ip,
      req.get('user-agent')
    );

    res.json(deletedUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// IT Admin: Clear user profile metadata
router.patch('/auth/users/:id/clear-profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const requestingUser = await getUserById(userId);
    if (!requestingUser || requestingUser.role !== 'System Administrator') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const targetUser = await getUserById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const clearedUser = await clearUserProfile(req.params.id);

    await logAuditEvent(
      userId,
      'USER_PROFILE_CLEARED',
      'USER',
      req.params.id,
      targetUser,
      clearedUser,
      req.ip,
      req.get('user-agent')
    );

    res.json(clearedUser);
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
