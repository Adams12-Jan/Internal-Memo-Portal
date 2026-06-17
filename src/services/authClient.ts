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
    department?: string
  ): Promise<AuthResponse> {
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

  async oauthLogin(
    provider: string,
    oauthId: string,
    email: string,
    firstName: string,
    lastName: string,
    profilePictureUrl?: string
  ): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        oauthId,
        email,
        firstName,
        lastName,
        profilePictureUrl
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `${provider} login failed`);
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

  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    const normalized: Record<string, string> = {};

    if (headers instanceof Headers) {
      headers.forEach((value, key) => {
        normalized[key] = value;
      });
    } else if (Array.isArray(headers)) {
      headers.forEach(([key, value]) => {
        normalized[key] = value;
      });
    } else if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
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
      ...this.getAuthHeaders()
    };

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
