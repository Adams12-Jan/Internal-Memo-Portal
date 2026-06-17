const API_BASE = import.meta.env.VITE_API_URL || '/api';

export interface ContactPayload {
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
}

export interface DealPayload {
  name: string;
  value?: number;
  stage?: string;
  contact_id?: string;
  description?: string;
}

export interface CampaignPayload {
  name: string;
  subject?: string;
  template_html?: string;
  target_count?: number;
  status?: string;
}

class CrmClient {
  private normalizeHeaders(headers?: HeadersInit): Record<string, string> {
    if (!headers) return {};
    if (headers instanceof Headers) {
      const obj: Record<string, string> = {};
      headers.forEach((v, k) => (obj[k] = v));
      return obj;
    }
    if (Array.isArray(headers)) return headers.reduce((o, [k, v]) => ((o[k] = v), o), {} as Record<string, string>);
    return { ...(headers as Record<string, string>) };
  }

  private async fetchWithAuth(input: RequestInfo, init?: RequestInit) {
    // Import auth token from localStorage directly to avoid circular deps
    const token = localStorage.getItem('auth_token');
    const headers = {
      ...this.normalizeHeaders(init?.headers),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    const response = await fetch(input, { ...init, headers });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return response.json();
  }

  // ===== CONTACTS =====
  async getContacts(limit = 50, offset = 0) {
    return this.fetchWithAuth(`${API_BASE}/crm/contacts?limit=${limit}&offset=${offset}`);
  }

  async createContact(payload: ContactPayload) {
    return this.fetchWithAuth(`${API_BASE}/crm/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteContact(id: string) {
    return this.fetchWithAuth(`${API_BASE}/crm/contacts/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ===== DEALS =====
  async getDeals(limit = 50, offset = 0) {
    return this.fetchWithAuth(`${API_BASE}/crm/deals?limit=${limit}&offset=${offset}`);
  }

  async createDeal(payload: DealPayload) {
    return this.fetchWithAuth(`${API_BASE}/crm/deals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async updateDeal(id: string, payload: Partial<DealPayload>) {
    return this.fetchWithAuth(`${API_BASE}/crm/deals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteDeal(id: string) {
    return this.fetchWithAuth(`${API_BASE}/crm/deals/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  // ===== CAMPAIGNS =====
  async getCampaigns(limit = 50, offset = 0) {
    return this.fetchWithAuth(`${API_BASE}/crm/campaigns?limit=${limit}&offset=${offset}`);
  }

  async createCampaign(payload: CampaignPayload) {
    return this.fetchWithAuth(`${API_BASE}/crm/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async updateCampaign(id: string, payload: Partial<CampaignPayload>) {
    return this.fetchWithAuth(`${API_BASE}/crm/campaigns/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteCampaign(id: string) {
    return this.fetchWithAuth(`${API_BASE}/crm/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

export default new CrmClient();
