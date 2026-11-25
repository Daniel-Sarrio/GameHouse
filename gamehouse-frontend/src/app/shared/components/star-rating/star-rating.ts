import { Component, computed, input } from '@angular/core';
import { LucideStar } from '@lucide/angular';

/**
 * Valoración de solo lectura con 5 estrellas que admite fracciones (4,5 → cuatro y media).
 * Cada estrella llena se recorta encima de una vacía según la parte que le corresponde.
 */
@Component({
  selector: 'app-star-rating',
  imports: [LucideStar],
  host: { role: 'img', '[attr.aria-label]': 'label()', class: 'inline-flex' },
  template: `
    @for (fill of fills(); track $index) {
      <span class="estrella" aria-hidden="true">
        <!-- El directivo de Lucide reescribe el class del svg: las clases van en los span. -->
        <span class="vacia"><svg lucideStar [size]="size()"></svg></span>
        <span class="llena" [style.width.%]="fill"><svg lucideStar [size]="size()"></svg></span>
      </span>
    }
  `,
  styles: [`
    :host { gap: 2px; }
    .estrella { position: relative; display: inline-flex; }
    .vacia { display: inline-flex; color: var(--borde-fuerte); }
    .llena { position: absolute; inset: 0 auto 0 0; display: inline-flex; overflow: hidden; color: #f59e0b; }
    .llena svg { flex-shrink: 0; fill: currentColor; }
  `],
})
export class StarRating {
  /** De 0 a 5. */
  readonly value = input.required<number>();
  readonly size = input(16);

  /** Porcentaje de relleno de cada una de las 5 estrellas. */
  readonly fills = computed(() => [0, 1, 2, 3, 4].map((index) => Math.round(Math.min(Math.max(this.value() - index, 0), 1) * 100)));
  readonly label = computed(() => `${this.value().toLocaleString('es-ES', { maximumFractionDigits: 1 })} de 5 estrellas`);
}
