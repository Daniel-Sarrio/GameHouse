import { Component, computed, input, signal } from '@angular/core';

/** Imagen de portada con relleno: si falta o no carga, muestra un degradado con la inicial. */
@Component({
  selector: 'app-cover-image',
  host: { class: 'block overflow-hidden bg-slate-100' },
  template: `
    @if (url() && failedUrl() !== url()) {
      <img [src]="url()" [alt]="alt()" [attr.loading]="eager() ? 'eager' : 'lazy'" decoding="async"
        referrerpolicy="no-referrer" class="h-full w-full object-cover" (error)="failedUrl.set(url())" />
    } @else {
      <div class="grid h-full w-full place-items-center bg-linear-to-br from-indigo-500 to-sky-400 text-4xl font-black text-white/90"
        role="img" [attr.aria-label]="alt()">{{ initial() }}</div>
    }
  `,
})
export class CoverImage {
  readonly url = input<string | null | undefined>();
  readonly alt = input.required<string>();
  readonly eager = input(false);
  readonly failedUrl = signal<string | null | undefined>(undefined);
  readonly initial = computed(() => this.alt().replace(/^Imagen de /, '').trim().charAt(0).toUpperCase() || 'G');
}
