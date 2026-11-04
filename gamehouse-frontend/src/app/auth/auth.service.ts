import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { RespuestaApi } from '../core/models/api.model';
import { AuthSession, AuthUser, LoginCredentials } from './auth.models';
import { AuthStore } from './auth.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private pendingValidation?: Promise<boolean>;
  private revision = 0;
  private channel?: BroadcastChannel;

  constructor() {
    if (typeof window !== 'undefined') {
      const onFocus = () => { void this.validateSession(); };
      window.addEventListener('focus', onFocus);
      // Sincroniza pestañas sin almacenar credenciales.
      this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gamehouse.auth') : undefined;
      if (this.channel) this.channel.onmessage = () => { void this.restoreSession(); };
      inject(DestroyRef).onDestroy(() => {
        window.removeEventListener('focus', onFocus);
        this.channel?.close();
      });
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const revision = ++this.revision;
    const response = await firstValueFrom(this.http
      .post<RespuestaApi<AuthSession>>(`${environment.apiUrl}/auth/login`, credentials)
      .pipe(timeout(environment.apiTimeoutMs)));
    if (revision === this.revision) {
      this.store.login(response.data);
      this.channel?.postMessage('session-changed');
    }
  }

  async logout(): Promise<void> {
    const request = firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(timeout(environment.apiTimeoutMs)));
    this.clearSession();
    try { await request; }
    catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) throw error;
    } finally { this.channel?.postMessage('session-changed'); }
  }

  private clearSession(): void {
    this.revision++;
    this.store.logout();
  }

  async restoreSession(): Promise<void> {
    this.revision++;
    this.pendingValidation = undefined;
    // Limpia la credencial heredada; nunca lee ni guarda tokens en almacenamiento web.
    try { localStorage.removeItem('gamehouse.auth.token'); } catch { /* Sin almacenamiento. */ }
    await this.validateSession();
  }

  validateSession(): Promise<boolean> {
    if (this.pendingValidation) return this.pendingValidation;
    const revision = this.revision;
    const storeRevision = this.store.revision();
    const pending = firstValueFrom(this.http
      .get<RespuestaApi<AuthUser> & { expiresAt: number }>(`${environment.apiUrl}/auth/me`)
      .pipe(timeout(environment.apiTimeoutMs)))
      .then(({ data, expiresAt }) => {
        if (revision !== this.revision || storeRevision !== this.store.revision()) return false;
        this.store.login({ expiresAt, user: data });
        return true;
      })
      .catch(() => {
        if (revision === this.revision && storeRevision === this.store.revision()) this.clearSession();
        return false;
      })
      .finally(() => {
        if (this.pendingValidation === pending) this.pendingValidation = undefined;
      });
    this.pendingValidation = pending;
    return pending;
  }
}
