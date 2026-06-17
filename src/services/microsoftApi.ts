export interface BackendUploadResult {
  id: string;
  name: string;
  size: number;
  storedPath: string;
  fileUrl: string;
  shareUrl?: string;
  message: string;
}

export interface MicrosoftFileActionResult {
  destination: 'onedrive' | 'sharepoint';
  fileUrl: string;
  shareUrl?: string;
  message: string;
}

export interface MicrosoftSignActionResult {
  signedUrl: string;
  message: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function uploadFileToBackend(file: File): Promise<BackendUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Backend file upload failed');
  }

  return response.json();
}

export async function uploadFileToMicrosoft(file: File, destination: 'onedrive' | 'sharepoint'): Promise<MicrosoftFileActionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('destination', destination);

  const response = await fetch(`${API_BASE}/microsoft/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Microsoft upload failed');
  }

  return response.json();
}

export async function requestMicrosoftSign(file: File, signerName: string): Promise<MicrosoftSignActionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('signerName', signerName);

  const response = await fetch(`${API_BASE}/microsoft/sign`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Microsoft sign request failed');
  }

  return response.json();
}
