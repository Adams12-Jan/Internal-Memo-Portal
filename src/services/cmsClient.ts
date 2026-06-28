import { getApiUrl } from './apiConfig';

const API_BASE = '/api';

export interface ContactPayload {
  name: string;
  email?: string;
  phone?: string;
  department?: string;
  role?: string;
  first_name?: string; // Added first name support
  last_name?: string;  // Added last name support
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

export interface MediaUploadResult {
  id: string;
  name: string;
  size: number;
  storedPath: string;
  fileUrl: string;
  shareUrl?: string;
  message: string;
}

class CmsClient {
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

    try {
      const response = await fetch(input, { ...init, headers });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
      }
      return response.json();
    } catch (err: any) {
      // Try falling back to relative /api path when absolute host is unreachable
      const inputStr = typeof input === 'string' ? input : (input as Request).url || '';
      let fallbackPath = '/api';
      try {
        const idx = inputStr.indexOf('/api');
        if (idx >= 0) {
          fallbackPath = inputStr.slice(idx);
        } else if (inputStr.startsWith('/')) {
          fallbackPath = `/api${inputStr}`;
        } else if (inputStr) {
          fallbackPath = `/api/${inputStr}`;
        }
      } catch {
        fallbackPath = '/api';
      }

      try {
        const response2 = await fetch(fallbackPath, { ...init, headers });
        if (!response2.ok) {
          const text = await response2.text();
          throw new Error(text || `Request failed: ${response2.status}`);
        }
        return response2.json();
      } catch {
        throw err;
      }
    }
  }

  // ===== CONTACTS =====
  async getContacts(limit = 50, offset = 0) {
    return this.fetchWithAuth(getApiUrl(`/cms/contacts?limit=${limit}&offset=${offset}`));
  }

  async searchContacts(query: string, limit = 50, offset = 0) {
    return this.fetchWithAuth(getApiUrl(`/cms/contacts/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`));
  }

  async updateContact(id: string, payload: Partial<ContactPayload>) {
    return this.fetchWithAuth(getApiUrl(`/cms/contacts/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async createContact(payload: ContactPayload) {
    return this.fetchWithAuth(getApiUrl('/cms/contacts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteContact(id: string) {
    return this.fetchWithAuth(getApiUrl(`/cms/contacts/${encodeURIComponent(id)}`), { method: 'DELETE' });
  }

  // ===== DEALS =====
  async getDeals(limit = 50, offset = 0) {
    return this.fetchWithAuth(getApiUrl(`/cms/deals?limit=${limit}&offset=${offset}`));
  }

  async createDeal(payload: DealPayload) {
    return this.fetchWithAuth(getApiUrl('/cms/deals'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async updateDeal(id: string, payload: Partial<DealPayload>) {
    return this.fetchWithAuth(getApiUrl(`/cms/deals/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteDeal(id: string) {
    return this.fetchWithAuth(getApiUrl(`/cms/deals/${encodeURIComponent(id)}`), { method: 'DELETE' });
  }

  async uploadMedia(file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(getApiUrl('/files/upload'), {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Media upload failed');
    }

    return response.json() as Promise<MediaUploadResult>;
  }

  // ===== CAMPAIGNS =====
  async getCampaigns(limit = 50, offset = 0) {
    return this.fetchWithAuth(getApiUrl(`/cms/campaigns?limit=${limit}&offset=${offset}`));
  }

  async createCampaign(payload: CampaignPayload) {
    return this.fetchWithAuth(getApiUrl('/cms/campaigns'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async updateCampaign(id: string, payload: Partial<CampaignPayload>) {
    return this.fetchWithAuth(getApiUrl(`/cms/campaigns/${encodeURIComponent(id)}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  async deleteCampaign(id: string) {
    return this.fetchWithAuth(getApiUrl(`/cms/campaigns/${encodeURIComponent(id)}`), { method: 'DELETE' });
  }
}

export default new CmsClient();
