import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { AuthService } from '../../auth/auth.service';
import { AlertService } from '../../core/services/alert.service';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Loader } from '../../shared/components/loader/loader';
import { Avatar } from '../../shared/components/avatar/avatar';
import { LucideStore } from '@lucide/angular';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Navbar, Loader, Avatar, LucideStore],
  template: `
    <div class="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <app-navbar />
      <div class="flex min-w-0 flex-col">
        <app-loader />
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-4 sm:px-10">
          <p class="text-sm font-semibold text-slate-900">{{ auth.isAdmin() ? 'Panel de administración' : 'Mi espacio' }}</p>
          <div class="ml-auto flex flex-wrap items-center justify-end gap-3 text-sm">
            <a routerLink="/perfil" routerLinkActive="bg-indigo-50" ariaCurrentWhenActive="page" class="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2 text-right no-underline transition hover:bg-indigo-50">
              <app-avatar [url]="auth.user()?.avatarUrl" [name]="auth.user()?.name || auth.user()?.email || 'Usuario'" />
              <span>
              <span class="block break-all font-semibold text-slate-900">{{ auth.user()?.name || auth.user()?.email }}</span>
              <span class="block text-xs font-medium text-indigo-600">Mi perfil</span>
              </span>
            </a>
            <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{{ auth.user()?.role }}</span>
            <!-- Acceso al home y la tienda públicos; el menú lateral queda solo para la gestión. -->
            <a routerLink="/" class="boton boton-secundario"><svg lucideStore [size]="16" aria-hidden="true"></svg> Ver tienda</a>
            <button class="boton boton-secundario" (click)="logout()">Cerrar sesión</button>
          </div>
        </header>
        <main class="min-w-0 flex-1"><router-outlet /></main>
        <footer class="border-t border-slate-200 px-6 py-5 text-xs text-slate-500 sm:px-10">GameHouse · Gestión de experiencias</footer>
      </div>
    </div>
  `,
})
export class MainLayout {
  readonly auth = inject(AuthStore);
  private readonly service = inject(AuthService);
  private readonly alerts = inject(AlertService);
  private readonly router = inject(Router);
  constructor() {
    effect(() => {
      if (!this.auth.isAuthenticated()) void this.router.navigate(['/login'], { queryParams: { reason: 'session', returnUrl: this.router.url }, replaceUrl: true });
    });
  }
  logout(): void {
    void this.service.logout().catch(() => this.alerts.error('La sesión local se ha cerrado, pero no se pudo confirmar la revocación en el servidor.'));
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
