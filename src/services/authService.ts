import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/db';
import * as crypto from 'crypto';

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

export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  department?: string,
  profilePictureUrl?: string | null
): Promise<AuthToken> {
  // Check if user exists
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const countResult = await query('SELECT COUNT(*) FROM users');
  const firstUser = countResult.rows[0]?.count === '0';
  const role = firstUser ? 'System Administrator' : 'staff';

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user with optional profile picture
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, department, role, profile_picture_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
    [email, passwordHash, firstName, lastName, department || 'Administration', role, profilePictureUrl || null]
  );

  const user = result.rows[0];
  const token = generateToken(user.id);

  // Generate email verification token
  await generateEmailVerificationToken(user.id);

  return {
    token,
    expiresIn: JWT_EXPIRY,
    user
  };
}

export async function loginUser(email: string, password: string): Promise<AuthToken> {
  const result = await query(
    `SELECT id, email, password_hash, first_name, last_name, department, role, is_active, is_verified, created_at
     FROM users WHERE email = $1 AND password_hash IS NOT NULL`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];

  if (!user.is_active) {
    throw new Error('Account is disabled');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

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
}

export async function generatePasswordResetToken(email: string): Promise<string> {
  const result = await query('SELECT id FROM users WHERE email = $1', [email]);
  
  if (result.rows.length === 0) {
    // Don't reveal that user doesn't exist (security best practice)
    return crypto.randomBytes(32).toString('hex');
  }

  const userId = result.rows[0].id;
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const result = await query(
    `SELECT user_id FROM password_reset_tokens 
     WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  const userId = result.rows[0].user_id;
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1', [token]);
}

export async function generateEmailVerificationToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await query(
    'INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

export async function verifyEmail(token: string): Promise<void> {
  const result = await query(
    `SELECT user_id FROM email_verification_tokens 
     WHERE token = $1 AND expires_at > NOW() AND verified_at IS NULL`,
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired verification token');
  }

  const userId = result.rows[0].user_id;

  await query('UPDATE users SET is_verified = true WHERE id = $1', [userId]);
  await query('UPDATE email_verification_tokens SET verified_at = NOW() WHERE token = $1', [token]);
}

export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
     FROM users WHERE id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

export async function getUsers(limit = 100, offset = 0): Promise<User[]> {
  const result = await query(
    `SELECT id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at
     FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  return result.rows;
}

export async function updateUserAccount(
  userId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    department?: string;
    role?: string;
    profile_picture_url?: string;
    is_active?: boolean;
  }
): Promise<User> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.first_name !== undefined) {
    setClauses.push(`first_name = $${paramCount++}`);
    values.push(updates.first_name);
  }
  if (updates.last_name !== undefined) {
    setClauses.push(`last_name = $${paramCount++}`);
    values.push(updates.last_name);
  }
  if (updates.department !== undefined) {
    setClauses.push(`department = $${paramCount++}`);
    values.push(updates.department);
  }
  if (updates.role !== undefined) {
    setClauses.push(`role = $${paramCount++}`);
    values.push(updates.role);
  }
  if (updates.profile_picture_url !== undefined) {
    setClauses.push(`profile_picture_url = $${paramCount++}`);
    values.push(updates.profile_picture_url);
  }
  if (updates.is_active !== undefined) {
    setClauses.push(`is_active = $${paramCount++}`);
    values.push(updates.is_active);
  }

  if (setClauses.length === 0) {
    return getUserById(userId) as Promise<User>;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramCount}
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
    values
  );

  return result.rows[0];
}

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
  const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, department, role, profile_picture_url, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
    [email, passwordHash, firstName, lastName, department, role, profilePictureUrl || null, isActive]
  );

  const user = result.rows[0];
  await generateEmailVerificationToken(user.id);
  return user;
}

export async function deleteUserAccount(userId: string): Promise<User> {
  const result = await query(
    `DELETE FROM users WHERE id = $1
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return result.rows[0];
}

export async function clearUserProfile(userId: string): Promise<User> {
  const result = await query(
    `UPDATE users
     SET first_name = '',
         last_name = '',
         department = '',
         profile_picture_url = NULL,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_active, is_verified, created_at`,
    [userId]
  );

  return result.rows[0];
}

export async function resetUserPasswordByAdmin(userId: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, userId]);
}

export async function generatePasswordResetTokenForUserId(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY);

  await query(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: {
    first_name?: string;
    last_name?: string;
    department?: string;
    profile_picture_url?: string;
  }
): Promise<User> {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.first_name !== undefined) {
    setClauses.push(`first_name = $${paramCount++}`);
    values.push(updates.first_name);
  }
  if (updates.last_name !== undefined) {
    setClauses.push(`last_name = $${paramCount++}`);
    values.push(updates.last_name);
  }
  if (updates.department !== undefined) {
    setClauses.push(`department = $${paramCount++}`);
    values.push(updates.department);
  }
  if (updates.profile_picture_url !== undefined) {
    setClauses.push(`profile_picture_url = $${paramCount++}`);
    values.push(updates.profile_picture_url);
  }

  if (setClauses.length === 0) {
    return getUserById(userId) as Promise<User>;
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(userId);

  const result = await query(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramCount} 
     RETURNING id, email, first_name, last_name, department, role, profile_picture_url, is_verified, created_at`,
    values
  );

  return result.rows[0];
}
