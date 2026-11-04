import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { AuthRole, AuthSession, AuthUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly currentUser = signal<AuthUser | null>(null);
  private expirationTimer?: ReturnType<typeof setTimeout>;
  readonly user = this.currentUser.asReadonly();
  // Identifica cambios de sesión sin exponer la cookie HttpOnly a JavaScript.
  readonly revision = signal(0);
  readonly isAuthenticated = computed(() => !!this.user());
  readonly roles = computed<AuthRole[]>(() => this.user() ? [this.user()!.role] : []);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.expirationTimer));
  }

  login(session: AuthSession): void {
    if (!Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()
      || !session.user.isActive || session.user.deletedAt || !['USER', 'ADMIN'].includes(session.user.role)) {
      this.logout();
      throw new Error('La sesión no es válida. Inicia sesión de nuevo.');
    }
    clearTimeout(this.expirationTimer);
    this.currentUser.set(session.user);
    this.revision.update(value => value + 1);
    const schedule = () => {
      const remaining = session.expiresAt - Date.now();
      if (remaining <= 0) { this.logout(); return; }
      this.expirationTimer = setTimeout(schedule, Math.min(remaining, 2_147_483_647));
    };
    schedule();
  }

  logout(): void {
    clearTimeout(this.expirationTimer);
    this.currentUser.set(null);
    this.revision.update(value => value + 1);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role.trim().toUpperCase() as AuthRole);
  }
}
