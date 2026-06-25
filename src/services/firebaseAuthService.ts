import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile as firebaseUpdateProfile,
  User as FirebaseUser,
  type Auth
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
  DocumentData,
  QuerySnapshot,
  type Firestore
} from 'firebase/firestore';
import { UserRole } from '../types';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject, type FirebaseStorage } from 'firebase/storage';
import { auth, firestore, storage, isConfigured } from '../firebase';

const USE_FIREBASE_MOCK = import.meta.env.VITE_USE_FIREBASE_MOCK === 'true';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  department: string;
  portal_identity?: string;
  role: string;
  profile_picture_url?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

class FirebaseAuthService {
  private userKey = 'auth_user';
  private tokenKey = 'auth_token';

  private ensureFirebaseReady(): void {
    if (!isConfigured || !auth || !firestore || !storage) {
      throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
    }
  }

  private mapPortalIdentityToRole(portalIdentity?: string): UserRole {
    const roleMapping: Record<string, UserRole> = {
      'Initiator': UserRole.ADMIN_OFFICER,
      'IT Support': UserRole.SYSTEM_ADMIN,
      'Line Manager': UserRole.HEAD_OF_ADMIN,
      'Internal Control': UserRole.INTERNAL_CONTROL,
      'Executive Manager': UserRole.EXECUTIVE_DIRECTOR,
      'Executive Director': UserRole.EXECUTIVE_DIRECTOR,
      'Finance': UserRole.FINANCE_OFFICER
    };

    if (portalIdentity && roleMapping[portalIdentity]) {
      return roleMapping[portalIdentity];
    }

    return UserRole.ADMIN_OFFICER;
  }

  // Accept a variety of role labels (legacy or alternate spellings) and map them to UserRole
  private parseRoleString(role?: string): UserRole | undefined {
    if (!role) return undefined;
    const normalized = role.trim().toLowerCase();
    if (Object.values(UserRole).map(v => v.toLowerCase()).includes(normalized)) {
      // It's already one of the enum display labels
      return Object.values(UserRole).find(v => v.toLowerCase() === normalized) as UserRole;
    }

    // Common legacy/alternate labels mapping
    if (normalized.includes('head') && (normalized.includes('admin') || normalized.includes('administration'))) return UserRole.HEAD_OF_ADMIN;
    if (normalized.includes('internal')) return UserRole.INTERNAL_CONTROL;
    if (normalized.includes('executive')) return UserRole.EXECUTIVE_DIRECTOR;
    if (normalized.includes('finance')) return UserRole.FINANCE_OFFICER;
    if (normalized.includes('system') || normalized.includes('it')) return UserRole.SYSTEM_ADMIN;
    if (normalized.includes('initiator') || normalized.includes('admin officer')) return UserRole.ADMIN_OFFICER;

    return undefined;
  }

  /**
   * Register a new user with email, password, and optional profile picture
   */
  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    portalIdentity?: string,
    profilePicture?: File | null
  ): Promise<AuthResponse> {
    if (USE_FIREBASE_MOCK || !isConfigured || !auth || !firestore || !storage) {
      if (!USE_FIREBASE_MOCK && (!isConfigured || !auth || !firestore || !storage)) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      // Fallback local dev implementation when mock is enabled: store mock user in localStorage
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      if (users.find(u => u.email === email)) {
        throw new Error('That email is already registered. Please login or use a different address.');
      }
      
      // Only allow registration if no users exist
      if (users.length > 0) {
        throw new Error('Self-registration is disabled. Please contact IT Support or your System Administrator to create an account.');
      }
      
      const id = `mock-${Date.now()}`;
      const user: AuthUser = {
        id,
        email,
        first_name: firstName,
        last_name: lastName,
        department: 'General',
        portal_identity: portalIdentity,
        role: this.mapPortalIdentityToRole(portalIdentity),
        profile_picture_url: undefined,
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };
      users.push({ ...user, password: password });
      localStorage.setItem(mockUsersKey, JSON.stringify(users));
      const token = `mock-token-${Date.now()}`;
      localStorage.setItem(this.tokenKey, token);
      this.setUser(user);
      return { token, expiresIn: '0', user };
    }

    try {
      // Check if users already exist in Firestore
      const usersSnapshot = await getDocs(collection(firestore, 'users'));
      if (usersSnapshot.size > 0) {
        throw new Error('Self-registration is disabled. Please contact IT Support or your System Administrator to create an account.');
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Update Firebase Auth profile
      await firebaseUpdateProfile(firebaseUser, {
        displayName: `${firstName} ${lastName}`
      });

      let profilePictureUrl: string | undefined;

      // Upload profile picture if provided
      if (profilePicture) {
        try {
          const fileName = `${firebaseUser.uid}-${Date.now()}`;
          const imageRef = storageRef(storage, `profile-pictures/${fileName}`);
          await uploadBytes(imageRef, profilePicture);
          profilePictureUrl = await getDownloadURL(imageRef);
        } catch (error) {
          console.error('Profile picture upload failed:', error);
          // Continue even if profile picture upload fails
        }
      }

      // Create user document in Firestore
      const userRole = this.mapPortalIdentityToRole(portalIdentity);

      const userData: Omit<AuthUser, 'id'> = {
        email,
        first_name: firstName,
        last_name: lastName,
        department: 'General',
        portal_identity: portalIdentity,
        role: userRole,
        ...(profilePictureUrl ? { profile_picture_url: profilePictureUrl } : {}),
        is_active: true,
        is_verified: false,
        created_at: new Date().toISOString()
      };

      const userRef = doc(firestore, 'users', firebaseUser.uid);
      await setDoc(userRef, userData);

      const token = await firebaseUser.getIdToken();
      const expiresIn = '1h'; // Firebase tokens expire in 1 hour

      const user: AuthUser = {
        id: firebaseUser.uid,
        ...userData
      };

      this.setUser(user);

      if (profilePicture) {
        void this.uploadProfilePicture(firebaseUser.uid, profilePicture)
          .then(async (uploadedUrl) => {
            const updatedUser: AuthUser = {
              ...user,
              profile_picture_url: uploadedUrl
            };

            try {
              await updateDoc(userRef, { profile_picture_url: uploadedUrl });
              this.setUser(updatedUser);
            } catch (error) {
              console.error('Failed to update profile picture URL after async upload:', error);
            }
          })
          .catch((error) => {
            console.error('Background profile picture upload failed:', error);
          });
      }

      return {
        token,
        expiresIn,
        user
      };
    } catch (error: any) {
      console.error('Firebase register error:', error?.code || 'no-code', error?.message || String(error), error);
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('That email is already registered. Please login or use a different address.');
      }
      throw new Error(error?.message || 'Registration failed');
    }
  }

  /**
   * Fallback: Login via server API instead of Firebase
   * Used when Firebase is unavailable or user is server-only
   */
  private async serverLogin(email: string, password: string): Promise<AuthResponse> {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Server login failed');
    }

    const data = await response.json();
    const token = data.token || data.access_token;
    const user = data.user;

    if (!token || !user) {
      throw new Error('Invalid server response: missing token or user');
    }

    // Store token and user
    localStorage.setItem(this.tokenKey, token);
    this.setUser(user);

    return {
      token,
      expiresIn: data.expiresIn || '24h',
      user
    };
  }

  /**
   * Login user with email and password
   * Tries Firebase first, falls back to server auth on credential errors
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    if (USE_FIREBASE_MOCK || !isConfigured || !auth || !firestore) {
      if (USE_FIREBASE_MOCK) {
        const mockUsersKey = 'mock_users';
        const usersJson = localStorage.getItem(mockUsersKey) || '[]';
        const users = JSON.parse(usersJson) as any[];
        const match = users.find(u => u.email === email && u.password === password);
        if (match) {
          const user: AuthUser = {
            id: match.id,
            email: match.email,
            first_name: match.first_name,
            last_name: match.last_name,
            department: match.department,
            portal_identity: match.portal_identity,
            role: match.role,
            profile_picture_url: match.profile_picture_url,
            is_active: match.is_active,
            is_verified: match.is_verified,
            created_at: match.created_at
          };
          const token = `mock-token-${Date.now()}`;
          localStorage.setItem(this.tokenKey, token);
          this.setUser(user);
          return { token, expiresIn: '0', user };
        }
        console.log('Mock login did not find a local user; attempting server login fallback...');
        return this.serverLogin(email, password);
      }

      // Firebase not configured; try server fallback
      console.log('Firebase not configured, attempting server login...');
      return this.serverLogin(email, password);
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Get user data from Firestore
      const user = await this.ensureUserProfile(firebaseUser);
      const token = await firebaseUser.getIdToken();
      const expiresIn = '1h';

      // Store token in localStorage for authClient to use in admin API calls
      localStorage.setItem(this.tokenKey, token);
      this.setUser(user);

      return {
        token,
        expiresIn,
        user
      };
    } catch (error: any) {
      console.error('Firebase login error:', error?.code || 'no-code', error?.message || String(error), error);
      console.log('Firebase auth failed, attempting server login fallback...');
      try {
        return await this.serverLogin(email, password);
      } catch (serverErr: any) {
        console.error('Server login fallback failed:', serverErr?.message || serverErr);
        throw new Error(serverErr?.message || error?.message || 'Login failed');
      }
    }
  }

  private async ensureUserProfile(firebaseUser: FirebaseUser): Promise<AuthUser> {
    if (!isConfigured || !auth || !firestore) {
      if (!USE_FIREBASE_MOCK) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      // Attempt to find mock user
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const match = firebaseUser ? users.find(u => u.id === firebaseUser.uid) : undefined;
      if (match) {
        return {
          id: match.id,
          email: match.email,
          first_name: match.first_name,
          last_name: match.last_name,
          department: match.department,
          portal_identity: match.portal_identity,
          role: match.role,
          profile_picture_url: match.profile_picture_url,
          is_active: match.is_active,
          is_verified: match.is_verified,
          created_at: match.created_at
        };
      }
      throw new Error('Firebase is not configured and no local mock user exists');
    }
    this.ensureFirebaseReady();
    const userRef = doc(firestore, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;
      const parsedRole = this.parseRoleString(userData.role as string | undefined);
      const normalizedRole = userData.portal_identity
        ? this.mapPortalIdentityToRole(userData.portal_identity)
        : (parsedRole || UserRole.ADMIN_OFFICER);
      const normalizedUserData: Omit<AuthUser, 'id'> = {
        ...userData,
        role: normalizedRole
      };

      if (normalizedRole !== userData.role) {
        await updateDoc(userRef, { role: normalizedRole });
      }

      return {
        id: firebaseUser.uid,
        ...normalizedUserData
      };
    }

    const displayName = firebaseUser.displayName || '';
    const [firstName, ...nameParts] = displayName.split(' ');
    const lastName = nameParts.join(' ') || '';
    const userData: Omit<AuthUser, 'id'> = {
      email: firebaseUser.email || '',
      first_name: firstName || 'Unknown',
      last_name: lastName || '',
      department: 'General',
      role: UserRole.ADMIN_OFFICER,
      ...(firebaseUser.photoURL ? { profile_picture_url: firebaseUser.photoURL } : {}),
      is_active: true,
      is_verified: firebaseUser.emailVerified || false,
      created_at: new Date().toISOString()
    };

    await setDoc(userRef, userData);

    return {
      id: firebaseUser.uid,
      ...userData
    };
  }

  /**
   * OAuth login - Sign up or login with OAuth provider
   * Note: For Google/Apple OAuth, use Firebase SDK's signInWithPopup or signInWithRedirect
   */
  /**
   * Request password reset email
   */
  async requestPasswordReset(email: string): Promise<{ message?: string }> {
    if (!isConfigured || !auth) {
      if (!USE_FIREBASE_MOCK) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      // Mock behavior
      return { message: 'Password reset (mock) processed' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { message: 'Password reset email sent' };
    } catch (error: any) {
      console.error('Password reset request error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Password reset request failed');
    }
  }

  /**
   * Reset password with token and new password
   * Note: In Firebase, you typically use the code from the email link
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.ensureFirebaseReady();
    try {
      await confirmPasswordReset(auth as Auth, token, newPassword);
    } catch (error: any) {
      console.error('Reset password error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Password reset failed');
    }
  }

  /**
   * Verify email (Firebase handles this via email link in the UI)
   */
  async verifyEmail(token: string): Promise<void> {
    // Firebase handles email verification through action links
    // This is a placeholder for compatibility
    console.log('Email verification handled by Firebase');
  }

  /**
   * Get all users (admin only)
   */
  async getUsers(): Promise<AuthUser[]> {
    if (!isConfigured || !auth || !firestore) {
      if (!USE_FIREBASE_MOCK) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      return users.map(u => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        department: u.department,
        portal_identity: u.portal_identity,
        role: u.role,
        profile_picture_url: u.profile_picture_url,
        is_active: u.is_active,
        is_verified: u.is_verified,
        created_at: u.created_at
      }));
    }
    try {
      const querySnapshot = await getDocs(collection(firestore, 'users'));
      const users: AuthUser[] = [];

      querySnapshot.forEach((doc) => {
        const userData = doc.data() as Omit<AuthUser, 'id'>;
        users.push({
          id: doc.id,
          ...userData
        });
      });

      return users;
    } catch (error: any) {
      console.error('getUsers error:', error?.code || 'no-code', error?.message || String(error), error);
      throw new Error(error.message || 'Failed to fetch users');
    }
  }

  /**
   * Update user profile (admin endpoint)
   */
  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    role?: string;
    profilePictureUrl?: string;
    isActive?: boolean;
    resetPassword?: string;
  }): Promise<AuthUser> {
    if (!isConfigured || !auth || !firestore) {
      if (!USE_FIREBASE_MOCK) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) throw new Error('User not found (mock)');
      const user = users[idx];
      if (updates.firstName) user.first_name = updates.firstName;
      if (updates.lastName) user.last_name = updates.lastName;
      if (updates.department) user.department = updates.department;
      if (updates.role) user.role = updates.role;
      if (updates.profilePictureUrl) user.profile_picture_url = updates.profilePictureUrl;
      if (updates.isActive !== undefined) user.is_active = updates.isActive;
      if (updates.resetPassword) user.password = updates.resetPassword;
      users[idx] = user;
      localStorage.setItem(mockUsersKey, JSON.stringify(users));
      return {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        department: user.department,
        portal_identity: user.portal_identity,
        role: user.role,
        profile_picture_url: user.profile_picture_url,
        is_active: user.is_active,
        is_verified: user.is_verified,
        created_at: user.created_at
      };
    }
    try {
      const userRef = doc(firestore, 'users', userId);

      // Prepare update object with Firestore-friendly keys
      const firestoreUpdate: Record<string, any> = {};
      if (updates.firstName) firestoreUpdate.first_name = updates.firstName;
      if (updates.lastName) firestoreUpdate.last_name = updates.lastName;
      if (updates.department) firestoreUpdate.department = updates.department;
      if (updates.role) firestoreUpdate.role = updates.role;
      if (updates.profilePictureUrl) firestoreUpdate.profile_picture_url = updates.profilePictureUrl;
      if (updates.isActive !== undefined) firestoreUpdate.is_active = updates.isActive;

      await updateDoc(userRef, firestoreUpdate);

      // Get updated user data
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;

      return {
        id: userDoc.id,
        ...userData
      };
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update user');
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<AuthUser> {
    if (!isConfigured || !auth || !firestore) {
      if (!USE_FIREBASE_MOCK) {
        throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
      }
      const stored = this.getUser();
      if (stored) return stored;
      // Try reading mock token and user
      const mockUsersKey = 'mock_users';
      const usersJson = localStorage.getItem(mockUsersKey) || '[]';
      const users = JSON.parse(usersJson) as any[];
      const token = localStorage.getItem(this.tokenKey);
      if (token && users.length > 0) {
        // return first mock user as current
        const u = users[0];
        const user: AuthUser = {
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          department: u.department,
          portal_identity: u.portal_identity,
          role: u.role,
          profile_picture_url: u.profile_picture_url,
          is_active: u.is_active,
          is_verified: u.is_verified,
          created_at: u.created_at
        };
        this.setUser(user);
        return user;
      }
      throw new Error('Firebase is not configured and no local mock user available. See FIREBASE_SETUP.md');
    }

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error('No user is currently authenticated');
      }

      const user = await this.ensureUserProfile(firebaseUser);

      // Refresh and store the token in localStorage for authClient
      const token = await firebaseUser.getIdToken();
      localStorage.setItem(this.tokenKey, token);
      
      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch user');
    }
  }

  /**
   * Update current user's profile
   */
  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    profilePictureUrl?: string;
  }): Promise<AuthUser> {
    if (!isConfigured || !auth || !firestore) {
      throw new Error('Firebase is not configured. Please check FIREBASE_SETUP.md and set environment variables in .env.local');
    }

    try {
      const firebaseUser = auth.currentUser;

      if (!firebaseUser) {
        throw new Error('No user is currently authenticated');
      }

      const userRef = doc(firestore, 'users', firebaseUser.uid);
      const firestoreUpdate: Record<string, any> = {};

      if (updates.firstName) firestoreUpdate.first_name = updates.firstName;
      if (updates.lastName) firestoreUpdate.last_name = updates.lastName;
      if (updates.department) firestoreUpdate.department = updates.department;
      if (updates.profilePictureUrl) firestoreUpdate.profile_picture_url = updates.profilePictureUrl;

      await updateDoc(userRef, firestoreUpdate);

      // Update Firebase Auth profile
      if (updates.firstName || updates.lastName || updates.profilePictureUrl) {
        const profileUpdates: Record<string, string> = {};
        if (updates.firstName || updates.lastName) {
          profileUpdates.displayName = `${updates.firstName || ''} ${updates.lastName || ''}`.trim();
        }
        if (updates.profilePictureUrl) {
          profileUpdates.photoURL = updates.profilePictureUrl;
        }
        if (Object.keys(profileUpdates).length > 0) {
          await firebaseUpdateProfile(firebaseUser, profileUpdates);
        }
      }

      const userDoc = await getDoc(userRef);
      const userData = userDoc.data() as Omit<AuthUser, 'id'>;
      const user: AuthUser = {
        id: firebaseUser.uid,
        ...userData
      };

      this.setUser(user);
      return user;
    } catch (error: any) {
      throw new Error(error.message || 'Profile update failed');
    }
  }

  /**
   * Get current auth token
   */
  async getToken(): Promise<string | null> {
    try {
      return auth ? await auth.currentUser?.getIdToken() || null : null;
    } catch {
      return null;
    }
  }

  /**
   * Get stored user
   */
  getUser(): AuthUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Set stored user
   */
  setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return (auth && !!auth.currentUser) || !!this.getUser();
  }

  /**
   * Clear stored auth user data from local storage
   */
  clearStoredUser(): void {
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('ca_session_logged_in');
    localStorage.removeItem('ca_session_user_idx');
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
      this.clearStoredUser();
    } catch (error: any) {
      throw new Error(error.message || 'Logout failed');
    }
  }

  /**
   * Get auth header for API calls
   */
  async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Upload profile picture
   */
  async uploadProfilePicture(userId: string, file: File): Promise<string> {
    this.ensureFirebaseReady();
    try {
      this.ensureFirebaseReady();
      const fileName = `${userId}-${Date.now()}`;
      const imageRef = storageRef(storage as FirebaseStorage, `profile-pictures/${fileName}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);

      // Update user's profile picture URL in Firestore
      await updateDoc(doc(firestore as Firestore, 'users', userId), {
        profile_picture_url: url
      });

      // Keep Firebase Auth profile in sync if available
      if (auth?.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, { photoURL: url });
      }

      return url;
    } catch (error: any) {
      throw new Error(error.message || 'Profile picture upload failed');
    }
  }

  /**
   * Delete profile picture
   */
  async deleteProfilePicture(userId: string, pictureUrl: string): Promise<void> {
    this.ensureFirebaseReady();
    try {
      // Delete from Storage
      const imageRef = storageRef(storage as FirebaseStorage, pictureUrl);
      await deleteObject(imageRef);

      // Update user document
      await updateDoc(doc(firestore as Firestore, 'users', userId), {
        profile_picture_url: null
      });
    } catch (error: any) {
      throw new Error(error.message || 'Profile picture deletion failed');
    }
  }
}

export default new FirebaseAuthService();
