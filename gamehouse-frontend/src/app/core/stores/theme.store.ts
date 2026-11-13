import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

/** Debe coincidir con la clave que lee el script de `index.html` antes de arrancar Angular. */
export const THEME_STORAGE_KEY = 'gamehouse-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark';

/**
 * Tema de la interfaz con Signals. Sin elección explícita sigue el modo del sistema operativo;
 * al pulsar el botón se guarda la preferencia. Aplica la clase `dark` en <html>, de la que
 * dependen los tokens de `styles.css` y la variante `dark:` de Tailwind.
 */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;
  private readonly media = this.window?.matchMedia?.(DARK_QUERY);

  private readonly preference = signal<Theme | null>(this.readPreference());
  private readonly systemPrefersDark = signal(this.media?.matches ?? false);

  readonly theme = computed<Theme>(() => this.preference() ?? (this.systemPrefersDark() ? 'dark' : 'light'));
  readonly isDark = computed(() => this.theme() === 'dark');

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      root.classList.toggle('dark', this.isDark());
      // Controles nativos (scrollbars, selects, date pickers) con el mismo esquema.
      root.style.colorScheme = this.theme();
    });

    const onSystemChange = (event: MediaQueryListEvent) => this.systemPrefersDark.set(event.matches);
    this.media?.addEventListener('change', onSystemChange);
    inject(DestroyRef).onDestroy(() => this.media?.removeEventListener('change', onSystemChange));
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: Theme): void {
    this.preference.set(theme);
    try {
      this.window?.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Navegación privada o almacenamiento bloqueado: el tema se aplica igualmente en esta sesión.
    }
  }

  private readPreference(): Theme | null {
    try {
      const stored = this.window?.localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(stored) ? stored : null;
    } catch {
      return null;
    }
  }
}
