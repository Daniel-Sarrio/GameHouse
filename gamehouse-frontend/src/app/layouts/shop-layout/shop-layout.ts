import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { Avatar } from '../../shared/components/avatar/avatar';
import { Loader } from '../../shared/components/loader/loader';
import { ThemeToggle } from '../../shared/components/theme-toggle/theme-toggle';

/** Layout público del home y del shop: no exige sesión, pero la reconoce si existe. */
@Component({
  selector: 'app-shop-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, Loader, ThemeToggle],
  template: `
    <app-loader />
    <header class="sticky top-0 z-20 border-b border-slate-200 bg-superficie/90 backdrop-blur">
      <div class="contenedor flex items-center gap-4 py-3">
        <a routerLink="/" class="flex items-center gap-2.5 no-underline" aria-label="GameHouse, ir al inicio">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-acento text-base font-black text-white">G</span>
          <strong class="hidden text-base tracking-tight text-slate-900 sm:block">GameHouse</strong>
        </a>
        <!-- El logo lleva al inicio; el menú solo enlaza a la tienda. -->
        <nav class="flex items-center gap-1" aria-label="Navegación principal">
          <a routerLink="/tienda" routerLinkActive="active" ariaCurrentWhenActive="page" class="nav-link">Tienda</a>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <app-theme-toggle />
          @if (auth.user(); as user) {
            <a routerLink="/dashboard" class="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-100">
              <app-avatar [url]="user.avatarUrl" [name]="user.name || user.email" />
              <span class="hidden sm:inline">Mi panel</span>
            </a>
          } @else {
            <a routerLink="/login" [queryParams]="{ returnUrl: router.url }" class="boton boton-primario px-4 py-2 text-sm">Acceder</a>
          }
        </div>
      </div>
    </header>
    <main class="min-w-0"><router-outlet /></main>
    <footer class="pie mt-8"><div class="contenedor">GameHouse · Experiencias gaming presenciales</div></footer>
  `,
  styles: [`
    .nav-link { padding: .45rem .8rem; border-radius: 10px; font-size: .9rem; font-weight: 650; color: var(--suave); text-decoration: none; }
    .nav-link:hover { background: var(--superficie-hover); color: var(--tinta); }
    .nav-link.active { background: var(--acento-suave); color: var(--acento-texto); }
  `],
})
export class ShopLayout {
  readonly auth = inject(AuthStore);
  readonly router = inject(Router);
}
