import { Component, computed, inject } from '@angular/core';
import { LucideMoon, LucideSun } from '@lucide/angular';
import { ThemeStore } from '../../../core/stores/theme.store';

/** Botón reutilizable para alternar entre modo claro y oscuro. */
@Component({
  selector: 'app-theme-toggle',
  imports: [LucideMoon, LucideSun],
  template: `
    <button type="button" class="theme-toggle" (click)="theme.toggle()" [attr.aria-label]="label()" [title]="label()">
      @if (theme.isDark()) {
        <svg lucideSun [size]="18" aria-hidden="true"></svg>
      } @else {
        <svg lucideMoon [size]="18" aria-hidden="true"></svg>
      }
    </button>
  `,
  styles: [`
    .theme-toggle {
      display: grid; place-items: center; width: 2.4rem; height: 2.4rem;
      border: 1px solid var(--borde); border-radius: 10px;
      background: var(--superficie); color: var(--tinta);
      transition: background .15s, border-color .15s;
    }
    .theme-toggle:hover { background: var(--superficie-hover); border-color: var(--borde-fuerte); }
  `],
})
export class ThemeToggle {
  readonly theme = inject(ThemeStore);
  readonly label = computed(() => (this.theme.isDark() ? 'Activar modo claro' : 'Activar modo oscuro'));
}
