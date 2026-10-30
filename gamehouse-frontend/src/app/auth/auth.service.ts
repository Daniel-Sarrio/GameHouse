import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { RespuestaApi } from '../core/models/api.model';
import { AuthSession, AuthUser, LoginCredentials } from './auth.models';
import { AuthStore } from './auth.store';
import { AUTH_STORAGE_KEY, tokenExpiresAt } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private pendingValidation?: Promise<boolean>;
  private revision = 0;

  constructor() {
    if (typeof window !== 'undefined') {
      const onStorage = (event: StorageEvent) => {
        if (event.key === AUTH_STORAGE_KEY || event.key === null) void this.restoreSession();
      };
      window.addEventListener('storage', onStorage);
      inject(DestroyRef).onDestroy(() => window.removeEventListener('storage', onStorage));
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    const revision = ++this.revision;
    const response = await firstValueFrom(
      this.http
        .post<RespuestaApi<AuthSession>>(`${environment.apiUrl}/auth/login`, credentials)
        .pipe(timeout(environment.apiTimeoutMs)),
    );
    if (revision === this.revision) this.store.login(response.data);
  }

  async logout(): Promise<void> {
    const token = this.store.token();
    // La suscripción captura el Bearer antes de limpiar la sesión local.
    const request = token && tokenExpiresAt(token) > Date.now()
      ? firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {})
        .pipe(timeout(environment.apiTimeoutMs)))
      : Promise.resolve();
    this.clearSession();
    try { await request; }
    catch (error) {
      // Una sesión ya invalidada también se considera cerrada.
      if (!(error instanceof HttpErrorResponse) || error.status !== 401) throw error;
    }
  }

  private clearSession(): void {
    this.revision++;
    this.store.logout();
  }

  async restoreSession(): Promise<void> {
    this.revision++;
    this.pendingValidation = undefined;
    this.store.restoreToken();
    await this.validateSession();
  }

  validateSession(): Promise<boolean> {
    const token = this.store.token();
    if (!token || tokenExpiresAt(token) <= Date.now()) {
      this.clearSession();
      return Promise.resolve(false);
    }
    if (this.pendingValidation) return this.pendingValidation;
    const revision = this.revision;
    const pending = firstValueFrom(
      this.http
        .get<RespuestaApi<AuthUser>>(`${environment.apiUrl}/auth/me`)
        .pipe(timeout(environment.apiTimeoutMs)),
    )
      .then(({ data }) => {
        if (revision !== this.revision || token !== this.store.token()) return false;
        this.store.login({ token, user: data });
        return true;
      })
      .catch(() => {
        if (revision === this.revision && token === this.store.token()) this.clearSession();
        return false;
      })
      .finally(() => {
        if (this.pendingValidation === pending) this.pendingValidation = undefined;
      });
    this.pendingValidation = pending;
    return pending;
  }
}
