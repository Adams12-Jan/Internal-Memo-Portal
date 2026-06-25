import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/db';
import * as crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  role: string;
  profile_picture_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthToken {
  token: string;
  expiresIn: string;
  user: User;
}

// Helper functions for DB error handling
function getDbErrorMessage(error: any): string {
  if (error.detail) return error.detail;
  if (error.message) return error.message;
  if (error.code === '23505') return 'Email already registered';
  return 'Database error';
}

function isDbConnectionRefusedError(error: any): boolean {
  if (!error) {
    return false;
  }

  const code = error.code || error.errno || error?.details;
  const message = String(error.message || error?.toString?.() || '').toLowerCase();

  return (
    code === 'ECONNREFUSED' ||
    code === '57P01' ||
    message.includes('econnrefused') ||
    message.includes('connection refused') ||
    message.includes('connect failed') ||
    message.includes('database is not reachable')
  );
}

async function readDevData(): Promise<{ users: any[]; emailTokens: any[] }> {
  const devFile = path.resolve(process.cwd(), 'dev_users.json');
  try {
    const raw = await fs.readFile(devFile, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { users: [], emailTokens: [] };
  }
}

function normalizeDevUser(user: any): User {
  return {
    id: user.id,
    email: user.email,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    department: user.department || 'Administration',
    role: user.role || 'Employee',
    profile_picture_url: user.profile_picture_url,
    is_active: user.is_active !== false,
    is_verified: user.is_verified !== false,
    created_at: user.created_at || new Date().toISOString()
  };
}

export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
       FROM users WHERE email = $1`,
      [email]
    );

    return result.rows[0] || null;
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    const devData = await readDevData();
    const devUser = devData.users.find(u => u.email === email);
    return devUser ? normalizeDevUser(devUser) : null;
  }
}

export async function getUserByFirebaseUid(uid: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
       FROM users WHERE oauth_provider = $1 AND oauth_id = $2`,
      ['firebase', uid]
    );

    return result.rows[0] || null;
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    const devData = await readDevData();
    const devUser = devData.users.find(u => u.oauth_provider === 'firebase' && u.oauth_id === uid);
    return devUser ? normalizeDevUser(devUser) : null;
  }
}

export async function linkFirebaseIdentity(userId: string, uid: string): Promise<void> {
  try {
    await query(
      `UPDATE users SET oauth_provider = $1, oauth_id = $2, updated_at = NOW() WHERE id = $3`,
      ['firebase', uid, userId]
    );
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    const devData = await readDevData();
    const userIndex = devData.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      throw new Error('User not found');
    }

    devData.users[userIndex].oauth_provider = 'firebase';
    devData.users[userIndex].oauth_id = uid;
    await fs.writeFile(path.resolve(process.cwd(), 'dev_users.json'), JSON.stringify(devData, null, 2), 'utf-8');
  }
}

// Register a new user (used during initial app setup)
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  department?: string,
  profilePictureUrl?: string | null
): Promise<AuthToken> {
  try {
    // Check if user exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      throw new Error('Email already registered');
    }

    const countResult = await query('SELECT COUNT(*) FROM users');
    const firstUser = countResult.rows[0]?.count === '0';
    if (!firstUser) {
      throw new Error('Self-registration is disabled. Please contact IT Support or your System Administrator to create an account.');
    }

    const role = 'System Administrator';
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, department, role, profile_picture_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
      [email, passwordHash, firstName, lastName, department || 'Administration', role, profilePictureUrl || null]
    );

    const user = result.rows[0];
    const token = generateToken(user.id);

    return {
      token,
      expiresIn: JWT_EXPIRY,
      user
    };
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Fall back to dev file
    const devFile = path.resolve(process.cwd(), 'dev_users.json');
    let devData = await readDevData();

    if (devData.users.some(u => u.email === email)) {
      throw new Error('Email already registered');
    }

    const allowDevSignupAnyway = process.env.NODE_ENV !== 'production' && department === 'IT Support';
    if (devData.users.length > 0 && !allowDevSignupAnyway) {
      throw new Error('Self-registration is disabled. Please contact IT Support or your System Administrator to create an account.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const devUser: User & { password_hash: string } = {
      id,
      email,
      first_name: firstName,
      last_name: lastName,
      department: department || 'Administration',
      role: 'System Administrator',
      profile_picture_url: profilePictureUrl || undefined,
      is_active: true,
      is_verified: false,
      created_at: now,
      password_hash: passwordHash
    };

    devData.users.push(devUser);
    await fs.writeFile(devFile, JSON.stringify(devData, null, 2), 'utf-8');

    const token = generateToken(devUser.id);
    return {
      token,
      expiresIn: JWT_EXPIRY,
      user: normalizeDevUser(devUser)
    };
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<AuthToken> {
  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    if (!user.is_active) {
      throw new Error('This account has been disabled');
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    const token = generateToken(user.id);

    return {
      token,
      expiresIn: JWT_EXPIRY,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        is_active: user.is_active,
        is_verified: user.is_verified,
        created_at: user.created_at
      }
    };
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Fall back to dev file
    const devData = await readDevData();
    const devUser = devData.users.find(u => u.email === email);

    if (!devUser) {
      throw new Error('Invalid email or password');
    }

    const passwordMatch = await bcrypt.compare(password, devUser.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    if (!devUser.is_active) {
      throw new Error('This account has been disabled');
    }

    const token = generateToken(devUser.id);

    return {
      token,
      expiresIn: JWT_EXPIRY,
      user: normalizeDevUser(devUser)
    };
  }
}

// Generate password reset token
export async function generatePasswordResetToken(email: string): Promise<string> {
  try {
    const result = await query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return token;
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // For dev mode, just generate a token (no persistence)
    return crypto.randomBytes(32).toString('hex');
  }
}

// Reset password with token
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    const result = await query(
      'SELECT user_id FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = result.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Delete used token
    await query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);
  } catch (error: any) {
    throw error;
  }
}

// Generate email verification token
export async function generateEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  try {
    await query(
      'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );
  } catch {
    // Dev mode: token not persisted
  }

  return token;
}

// Verify email with token
export async function verifyEmail(token: string): Promise<void> {
  try {
    const result = await query(
      'SELECT user_id FROM email_verification_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired verification token');
    }

    const userId = result.rows[0].user_id;

    await query('UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1', [userId]);

    // Delete used token
    await query('DELETE FROM email_verification_tokens WHERE token = $1', [token]);
  } catch (error: any) {
    throw error;
  }
}

// Get user by ID
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
       FROM users WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Dev mode fallback
    const devData = await readDevData();
    const devUser = devData.users.find(u => u.id === userId);
    return devUser ? normalizeDevUser(devUser) : null;
  }
}

// Get all users
export async function getUsers(limit = 100, offset = 0): Promise<User[]> {
  try {
    const result = await query(
      `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
       FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Dev mode fallback
    const devData = await readDevData();
    return devData.users
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map(normalizeDevUser);
  }
}

// Update user account
export async function updateUserAccount(
  userId: string,
  updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    role?: string;
    profilePictureUrl?: string;
    isActive?: boolean;
  }
): Promise<User> {
  try {
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (updates.firstName !== undefined) {
      setClauses.push(`first_name = $${paramCount++}`);
      values.push(updates.firstName);
    }
    if (updates.lastName !== undefined) {
      setClauses.push(`last_name = $${paramCount++}`);
      values.push(updates.lastName);
    }
    if (updates.department !== undefined) {
      setClauses.push(`department = $${paramCount++}`);
      values.push(updates.department);
    }
    if (updates.role !== undefined) {
      setClauses.push(`role = $${paramCount++}`);
      values.push(updates.role);
    }
    if (updates.profilePictureUrl !== undefined) {
      setClauses.push(`profile_picture_url = $${paramCount++}`);
      values.push(updates.profilePictureUrl);
    }
    if (updates.isActive !== undefined) {
      setClauses.push(`is_active = $${paramCount++}`);
      values.push(updates.isActive);
    }

    if (setClauses.length === 0) {
      return (await getUserById(userId)) as User;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramCount}
       RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Dev mode fallback
    const devData = await readDevData();
    const userIndex = devData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const user = devData.users[userIndex];

    if (updates.firstName !== undefined) user.first_name = updates.firstName;
    if (updates.lastName !== undefined) user.last_name = updates.lastName;
    if (updates.department !== undefined) user.department = updates.department;
    if (updates.role !== undefined) user.role = updates.role;
    if (updates.profilePictureUrl !== undefined) user.profile_picture_url = updates.profilePictureUrl;
    if (updates.isActive !== undefined) user.is_active = updates.isActive;

    user.updated_at = new Date().toISOString();

    const devFile = path.resolve(process.cwd(), 'dev_users.json');
    await fs.writeFile(devFile, JSON.stringify(devData, null, 2), 'utf-8');

    return normalizeDevUser(user);
  }
}

// Create a new user account (admin function)
export async function createUserAccount(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  department: string,
  role: string,
  profilePictureUrl?: string | null,
  isActive = true
): Promise<User> {
  try {
    // Check if user exists
    const existingResult = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingResult.rows.length > 0) {
      throw new Error('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (email, password_hash, first_name, last_name, department, role, profile_picture_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
      [email, passwordHash, firstName, lastName, department, role, profilePictureUrl || null, isActive]
    );

    return result.rows[0];
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    const devData = await readDevData();
    if (devData.users.some(u => u.email === email)) {
      throw new Error('Email already registered');
    }

    const id = crypto.randomUUID?.() || crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password, 10);

    const devUser: User & { password_hash: string } = {
      id,
      email,
      first_name: firstName,
      last_name: lastName,
      department,
      role,
      profile_picture_url: profilePictureUrl || undefined,
      is_active: isActive,
      is_verified: true,
      created_at: now,
      password_hash: passwordHash
    };

    devData.users.push(devUser);
    await fs.writeFile(path.resolve(process.cwd(), 'dev_users.json'), JSON.stringify(devData, null, 2), 'utf-8');

    return normalizeDevUser(devUser);
  }
}

// Delete user account
export async function deleteUserAccount(userId: string): Promise<User> {
  try {
    const result = await query(
      `DELETE FROM users WHERE id = $1
       RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Dev mode fallback
    const devData = await readDevData();
    const userIndex = devData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    const deletedUser = devData.users.splice(userIndex, 1)[0];
    const devFile = path.resolve(process.cwd(), 'dev_users.json');
    await fs.writeFile(devFile, JSON.stringify(devData, null, 2), 'utf-8');

    return normalizeDevUser(deletedUser);
  }
}

// Clear user profile (admin function)
export async function clearUserProfile(userId: string): Promise<User> {
  try {
    const result = await query(
      `UPDATE users
       SET first_name = '', last_name = '', department = '', profile_picture_url = NULL, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0];
  } catch (error: any) {
    const isConnRefused = isDbConnectionRefusedError(error);
    if (!isConnRefused) {
      throw error;
    }

    // Dev mode fallback
    const devData = await readDevData();
    const userIndex = devData.users.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      throw new Error('User not found');
    }

    devData.users[userIndex].first_name = '';
    devData.users[userIndex].last_name = '';
    devData.users[userIndex].department = '';
    devData.users[userIndex].profile_picture_url = null;
    devData.users[userIndex].updated_at = new Date().toISOString();

    const devFile = path.resolve(process.cwd(), 'dev_users.json');
    await fs.writeFile(devFile, JSON.stringify(devData, null, 2), 'utf-8');

    return normalizeDevUser(devData.users[userIndex]);
  }
}

// Reset password by admin
export async function resetUserPasswordByAdmin(userId: string, newPassword: string): Promise<void> {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
  } catch (error: any) {
    throw error;
  }
}

// Generate password reset token for user ID
export async function generatePasswordResetTokenForUserId(userId: string): Promise<string> {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

    await query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    );

    return token;
  } catch (error: any) {
    // In dev mode, just return a token
    return crypto.randomBytes(32).toString('hex');
  }
}

// Generate JWT token
export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch {
    return null;
  }
}
