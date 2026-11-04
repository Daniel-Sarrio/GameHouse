import { environment } from '../../environments/environment';

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
