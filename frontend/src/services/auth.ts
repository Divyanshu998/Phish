const API_BASE = 'https://phishguard-ai-backend-1edk.onrender.com/api/auth';

export interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  email_verified: boolean;
  role?: 'user' | 'admin';
  created_at?: string;
  last_login?: string;
  alert_preferences?: Record<string, boolean>;
}

export const authService = {
  getToken(): string | null {
    return localStorage.getItem('phishguard_token');
  },

  setAuth(token: string, user: Partial<UserProfile>) {
    localStorage.setItem('phishguard_token', token);
    localStorage.setItem('phishguard_user', JSON.stringify(user));
  },

  getUser(): UserProfile | null {
    const raw = localStorage.getItem('phishguard_user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('phishguard_token');
    localStorage.removeItem('phishguard_user');
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  async signup(name: string, email: string, password: string, confirmPassword: string) {
    const res = await fetch(`${API_BASE}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, confirm_password: confirmPassword })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Signup failed');
    }
    this.setAuth(data.token, { user_id: data.user_id, name: data.name, email: data.email, email_verified: data.email_verified });
    return data;
  },

  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || 'Login failed');
    }
    this.setAuth(data.token, { user_id: data.user_id, name: data.name, email: data.email, email_verified: data.email_verified, role: data.role || 'user' });
    return data;
  },

  async getProfile(): Promise<UserProfile> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to fetch user profile');
    // persist updated role if returned
    const user = this.getUser();
    const merged = { ...(user || {}), ...data } as UserProfile;
    localStorage.setItem('phishguard_user', JSON.stringify(merged));
    return merged;
  },

  async verifyEmail(token: string) {
    const res = await fetch(`${API_BASE}/verify-email?token=${token}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Email verification failed');
    return data;
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_BASE}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async resetPassword(token: string, newPassword: string) {
    const res = await fetch(`${API_BASE}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Reset password failed');
    return data;
  },

  async updateSettings(name?: string, alertPreferences?: Record<string, boolean>) {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, alert_preferences: alertPreferences })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to update settings');
    return data;
  }
};
