import { Injectable, computed, signal } from '@angular/core';
import { AuthRole, AuthUser } from './auth.models';

/** Estado de la sesión en signals. No guarda tokens: viajan solo en cookies HttpOnly. */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly currentUser = signal<AuthUser | null>(null);
  readonly user = this.currentUser.asReadonly();
  // Identifica cambios de sesión para descartar respuestas de una sesión anterior.
  readonly revision = signal(0);
  readonly isAuthenticated = computed(() => !!this.user());
  readonly roles = computed<AuthRole[]>(() => this.user() ? [this.user()!.role] : []);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));

  setUser(user: AuthUser): void {
    if (!user?.id || !['USER', 'ADMIN'].includes(user.role)) {
      this.clear();
      throw new Error('La sesión no es válida. Inicia sesión de nuevo.');
    }
    this.currentUser.set(user);
    this.revision.update(value => value + 1);
  }

  clear(): void {
    if (!this.currentUser()) return;
    this.currentUser.set(null);
    this.revision.update(value => value + 1);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role.trim().toUpperCase() as AuthRole);
  }
}
