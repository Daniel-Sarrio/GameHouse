import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuthRole, AuthSession, AuthUser } from './auth.models';
import { AUTH_STORAGE_KEY, tokenExpiresAt } from './auth.utils';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly currentUser = signal<AuthUser | null>(null);
  private readonly currentToken = signal<string | null>(null);
  private expirationTimer?: ReturnType<typeof setTimeout>;
  readonly user = this.currentUser.asReadonly();
  readonly token = this.currentToken.asReadonly();
  readonly isAuthenticated = computed(() => !!this.token() && !!this.user());
  readonly roles = computed<AuthRole[]>(() => (this.user() ? [this.user()!.role] : []));
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expirationTimer));
  }

  login(session: AuthSession): void {
    if (
      tokenExpiresAt(session.token) <= Date.now() ||
      !session.user.isActive ||
      session.user.deletedAt ||
      !['USER', 'ADMIN'].includes(session.user.role)
    ) {
      this.logout();
      throw new Error('La sesión no es válida. Inicia sesión de nuevo.');
    }
    this.currentUser.set(session.user);
    this.setToken(session.token);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, session.token);
    } catch {
      /* Sesión en memoria si el navegador bloquea almacenamiento. */
    }
  }

  restoreToken(): void {
    let token: string | null = null;
    try {
      token = localStorage.getItem(AUTH_STORAGE_KEY);
    } catch {
      /* Sin almacenamiento. */
    }
    this.currentUser.set(null);
    if (!token || tokenExpiresAt(token) <= Date.now()) {
      this.logout();
      return;
    }
    this.setToken(token);
  }

  logout(): void {
    clearTimeout(this.expirationTimer);
    this.currentUser.set(null);
    this.currentToken.set(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* Sin almacenamiento. */
    }
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role.trim().toUpperCase() as AuthRole);
  }

  private setToken(token: string): void {
    clearTimeout(this.expirationTimer);
    this.currentToken.set(token);
    const schedule = () => {
      const remaining = tokenExpiresAt(token) - Date.now();
      if (remaining <= 0) {
        this.logout();
        return;
      }
      this.expirationTimer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    };
    schedule();
  }
}
