export function getApiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();

  if (!configured) {
    return '/api';
  }
  let normalized = configured.replace(/\/+$|^\s+|\s+$/g, '');
  if (!normalized) {
    return '/api';
  }

  const isAbsolute = /^https?:\/\//i.test(normalized) || normalized.startsWith('//');
  const looksLikeHost = /^[\w.-]+(:\d+)?(?:\/.*)?$/.test(normalized);

  if (!isAbsolute && looksLikeHost) {
    if (normalized.startsWith('/')) {
      return `${normalized}/api`;
    }
    normalized = `http://${normalized}`;
  }

  if (normalized.startsWith('//')) {
    normalized = `https:${normalized}`;
  }

  try {
    const parsed = new URL(normalized);
    const path = parsed.pathname.replace(/\/+$|^\s+|\s+$/g, '');
    if (path === '' || path === '/') {
      return `${parsed.origin}/api`;
    }
    if (path.toLowerCase().endsWith('/api')) {
      return `${parsed.origin}${path}`;
    }
    return `${parsed.origin}${path}/api`;
  } catch {
    return '/api';
  }
}

export function getApiUrl(path: string): string {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
