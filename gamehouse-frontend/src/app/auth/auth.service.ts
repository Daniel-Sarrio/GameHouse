import { HttpBackend, HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { RespuestaApi } from '../core/models/api.model';
import { AuthSession, AuthUser, LoginCredentials } from './auth.models';
import { AuthStore } from './auth.store';

/**
 * Sesión basada en cookies HttpOnly (withCredentials): access token de 1 h y refresh token de 7 días.
 * El cliente nunca lee ni guarda tokens; solo conoce el usuario que devuelve el servidor.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  // Sin interceptores: renovar la sesión no debe disparar otro refresh, ni el spinner, ni alertas.
  private readonly httpWithoutInterceptors = new HttpClient(inject(HttpBackend));
  private readonly store = inject(AuthStore);
  private pendingLoad?: Promise<boolean>;
  private pendingRefresh?: Promise<boolean>;
  private revision = 0;
  private channel?: BroadcastChannel;

  constructor() {
    if (typeof window !== 'undefined') {
      const onFocus = () => { if (this.store.isAuthenticated()) void this.loadUser(); };
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
      this.pendingLoad = undefined;
      this.store.setUser(response.data.user);
      this.channel?.postMessage('session-changed');
    }
  }

  /** Revoca la sesión en el servidor (borra ambas cookies) y la cierra en el cliente. */
  async logout(): Promise<void> {
    const request = firstValueFrom(this.http.post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(timeout(environment.apiTimeoutMs)));
    this.clearSession();
    try { await request; }
    finally { this.channel?.postMessage('session-changed'); }
  }

  /**
   * Renueva el access token con la cookie de refresh (el servidor rota ambas cookies).
   * Si varias peticiones reciben 401 a la vez, comparten una única renovación.
   */
  refreshSession(): Promise<boolean> {
    this.pendingRefresh ??= firstValueFrom(this.httpWithoutInterceptors
      .post(`${environment.apiUrl}/auth/refresh`, {}, {
        withCredentials: true,
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      .pipe(timeout(environment.apiTimeoutMs)))
      .then(() => true, () => false)
      .finally(() => { this.pendingRefresh = undefined; });
    return this.pendingRefresh;
  }

  /**
   * La sesión no se ha podido renovar: logout en el servidor y en el cliente.
   * Un visitante anónimo no tiene nada que cerrar, salvo que `force` indique que había sesión.
   */
  endSession(force = false): void {
    if (!force && !this.store.isAuthenticated()) return;
    void this.logout().catch(() => undefined);
  }

  private clearSession(): void {
    this.revision++;
    this.pendingLoad = undefined;
    this.store.clear();
  }

  async restoreSession(): Promise<void> {
    this.revision++;
    this.pendingLoad = undefined;
    // Limpia la credencial heredada; nunca lee ni guarda tokens en almacenamiento web.
    try { localStorage.removeItem('gamehouse.auth.token'); } catch { /* Sin almacenamiento. */ }
    await this.loadUser();
  }

  /** Carga el usuario actual con GET /auth/me. Si el access token caducó, el interceptor lo renueva. */
  loadUser(): Promise<boolean> {
    if (this.pendingLoad) return this.pendingLoad;
    const revision = this.revision;
    const pending = firstValueFrom(this.http
      .get<RespuestaApi<AuthUser>>(`${environment.apiUrl}/auth/me`)
      .pipe(timeout(environment.apiTimeoutMs)))
      .then(({ data }) => {
        if (revision !== this.revision) return this.store.isAuthenticated();
        this.store.setUser(data);
        return true;
      })
      .catch(() => {
        if (revision === this.revision) this.clearSession();
        return false;
      })
      .finally(() => {
        if (this.pendingLoad === pending) this.pendingLoad = undefined;
      });
    this.pendingLoad = pending;
    return pending;
  }
}
