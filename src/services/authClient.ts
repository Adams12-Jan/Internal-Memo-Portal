const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface AuthUser {
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

export interface AuthResponse {
  token: string;
  expiresIn: string;
  user: AuthUser;
}

class AuthService {
  private tokenKey = 'auth_token';
  private userKey = 'auth_user';

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    department?: string,
    profilePicture?: File | null
  ): Promise<AuthResponse> {
    // If there's a profile picture, use FormData; otherwise use JSON
    if (profilePicture) {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      if (department) {
        formData.append('department', department);
      }
      formData.append('profilePicture', profilePicture);

      // Log FormData entries for debugging
      console.log('Sending FormData with fields:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: formData
        // Don't set Content-Type header; let the browser set it with boundary
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    } else {
      // Original JSON-based registration
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, department })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();
      this.setToken(data.token);
      this.setUser(data.user);
      return data;
    }
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  }

  async requestPasswordReset(email: string): Promise<{ resetToken?: string; message?: string }> {
    const response = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Request failed');
    }

    return response.json();
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Reset failed');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Verification failed');
    }
  }

  async getUsers(): Promise<AuthUser[]> {
    const response = await this.fetchWithAuth(`${API_BASE}/auth/users`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Failed to fetch users');
    }
    return response.json();
  }

  async updateUser(userId: string, updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    role?: string;
    profilePictureUrl?: string;
    isActive?: boolean;
    resetPassword?: string;
  }): Promise<AuthUser> {
    const response = await this.fetchWithAuth(`${API_BASE}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update user');
    }

    return response.json();
  }

  async createUser(user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    department: string;
    role: string;
    profilePictureUrl?: string;
    isActive?: boolean;
  }): Promise<AuthUser> {
    const response = await this.fetchWithAuth(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create user');
    }

    return response.json();
  }

  async deleteUser(userId: string): Promise<AuthUser> {
    const response = await this.fetchWithAuth(`${API_BASE}/auth/users/${encodeURIComponent(userId)}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete user');
    }

    return response.json();
  }

  async clearUserProfile(userId: string): Promise<AuthUser> {
    const response = await this.fetchWithAuth(`${API_BASE}/auth/users/${encodeURIComponent(userId)}/clear-profile`, {
      method: 'PATCH'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to clear user profile');
    }

    return response.json();
  }

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        normalized[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]: [string, string | string[]]) => {
        if (typeof value === 'string') {
          normalized[key] = value;
        } else if (Array.isArray(value)) {
          normalized[key] = value.join(', ');
        }
      });
    } else if (headers) {
      Object.entries(headers as Record<string, string | string[]>).forEach(([key, value]) => {
        if (typeof value === 'string') {
          normalized[key] = value;
        } else if (Array.isArray(value)) {
          normalized[key] = value.join(', ');
        }
      });
    }

    const token = this.getToken();
    if (token) {
      normalized.Authorization = `Bearer ${token}`;
    }

    return normalized;
  }

  private async fetchWithAuth(input: RequestInfo, init?: RequestInit) {
    const headers = {
      ...this.normalizeHeaders(init?.headers),
      ...this.getAuthHeader()
    };

    if (!headers.Authorization && typeof window !== 'undefined') {
      const currentUserJson = window.localStorage.getItem(this.userKey);
      if (currentUserJson) {
        try {
          const currentUser = JSON.parse(currentUserJson) as AuthUser & { portal_identity?: string };
          if (
            process.env.NODE_ENV === 'development' &&
            (currentUser.role === 'System Administrator' || currentUser.portal_identity === 'IT Support')
          ) {
            headers['X-Dev-Admin'] = 'true';
            headers['X-Dev-User-Id'] = currentUser.id;
          }
        } catch {
          // ignore invalid stored user
        }
      }
    }

    const response = await fetch(input, {
      ...init,
      headers
    });

    return response;
  }

  async getCurrentUser(): Promise<AuthUser> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }

    const response = await this.fetchWithAuth(`${API_BASE}/auth/me`);

    if (!response.ok) {
      this.logout();
      throw new Error('Failed to fetch user');
    }

    const user = await response.json();
    this.setUser(user);
    return user;
  }

  async updateProfile(updates: {
    firstName?: string;
    lastName?: string;
    department?: string;
    profilePictureUrl?: string;
  }): Promise<AuthUser> {
    const token = this.getToken();
    if (!token) {
      throw new Error('No token found');
    }

    const response = await this.fetchWithAuth(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Update failed');
    }

    const user = await response.json();
    this.setUser(user);
    return user;
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getUser(): AuthUser | null {
    const userJson = localStorage.getItem(this.userKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  setUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }
}

export default new AuthService();
