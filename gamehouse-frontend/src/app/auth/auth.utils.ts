import { environment } from '../../environments/environment';

export const AUTH_STORAGE_KEY = 'gamehouse.auth.token';

// Decodificar permite comprobar la caducidad; la firma y los permisos los valida el backend.
export function tokenExpiresAt(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function isApiUrl(url: string): boolean {
  const base = environment.apiUrl.replace(/\/$/, '');
  return url === base || url.startsWith(`${base}/`) || url.startsWith(`${base}?`);
}

export function safeReturnUrl(value: string | null, fallback: string): string {
  return value &&
    /^\/(?!\/)/.test(value) &&
    !/[\\\r\n]/.test(value) &&
    !/^\/login(?:[/?#;]|$)/.test(value)
    ? value
    : fallback;
}
