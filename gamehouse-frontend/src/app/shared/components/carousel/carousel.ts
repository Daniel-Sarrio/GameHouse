import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

/**
 * Carrusel genérico con scroll-snap. Proyecta cualquier contenido: cada hijo es una diapositiva
 * de ancho `itemWidth` (por ejemplo '15rem' para tarjetas o '100%' para imágenes).
 */
@Component({
  selector: 'app-carousel',
  imports: [LucideChevronLeft, LucideChevronRight],
  template: `
    <section class="carousel" [attr.aria-label]="label()" aria-roledescription="carrusel">
      @if (title() || showArrows()) {
        <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div class="min-w-0">
            @if (title()) {
              <h2 class="text-xl font-bold text-slate-900 sm:text-2xl">{{ title() }}</h2>
            }
            @if (subtitle()) {
              <p class="mt-1 text-sm text-slate-500">{{ subtitle() }}</p>
            }
          </div>
          <div class="flex items-center gap-2">
            <ng-content select="[carouselAction]" />
            @if (showArrows()) {
              <button type="button" class="arrow" [disabled]="!canPrev()" (click)="scroll(-1)" aria-label="Anterior">
                <svg lucideChevronLeft [size]="18" aria-hidden="true"></svg>
              </button>
              <button type="button" class="arrow" [disabled]="!canNext()" (click)="scroll(1)" aria-label="Siguiente">
                <svg lucideChevronRight [size]="18" aria-hidden="true"></svg>
              </button>
            }
          </div>
        </div>
      }
      <div #track class="track" tabindex="0" [style.--item-width]="itemWidth()" (scroll)="update()">
        <ng-content />
      </div>
      @if (showIndicators() && slideCount() > 1) {
        <div class="mt-3 flex justify-center gap-2">
          @for (index of indexes(); track index) {
            <button type="button" class="dot" [class.active]="index === activeIndex()" (click)="goTo(index)"
              [attr.aria-label]="'Ir a la diapositiva ' + (index + 1)" [attr.aria-current]="index === activeIndex()"></button>
          }
        </div>
      }
    </section>
  `,
  styles: [`
    .track {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: var(--item-width, 15rem);
      gap: 1rem;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scroll-behavior: smooth;
      scrollbar-width: none;
      padding-bottom: .25rem;
    }
    .track::-webkit-scrollbar { display: none; }
    /* Las diapositivas son contenido proyectado: necesitan ::ng-deep, limitado a este componente. */
    :host ::ng-deep .track > * { scroll-snap-align: start; min-width: 0; }
    .arrow {
      display: grid; place-items: center; width: 2.25rem; height: 2.25rem;
      border-radius: 999px; border: 1px solid var(--borde); background: var(--superficie); color: var(--tinta);
    }
    .arrow:hover:not(:disabled) { background: var(--superficie-hover); }
    .arrow:disabled { opacity: .4; cursor: default; }
    .dot { width: .55rem; height: .55rem; border-radius: 999px; border: 0; background: var(--borde-fuerte); padding: 0; }
    .dot.active { width: 1.5rem; background: var(--azul); }
    @media (prefers-reduced-motion: reduce) { .track { scroll-behavior: auto; } }
  `],
})
export class Carousel {
  readonly label = input.required<string>();
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly itemWidth = input('15rem');
  readonly showArrows = input(true);
  readonly showIndicators = input(false);

  readonly canPrev = signal(false);
  readonly canNext = signal(false);
  readonly slideCount = signal(0);
  readonly activeIndex = signal(0);
  readonly indexes = signal<number[]>([]);

  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const element = this.track().nativeElement;
      // Recalcula flechas e indicadores cuando cambian el tamaño o las diapositivas.
      const resize = new ResizeObserver(() => this.update());
      const mutations = new MutationObserver(() => this.update());
      resize.observe(element);
      mutations.observe(element, { childList: true });
      this.update();
      destroyRef.onDestroy(() => { resize.disconnect(); mutations.disconnect(); });
    });
  }

  /** Avanza tantas diapositivas completas como caben en pantalla, sin quedarse a medias. */
  scroll(direction: 1 | -1): void {
    const element = this.track().nativeElement;
    const step = this.step();
    const visible = Math.max(1, Math.floor((element.clientWidth + this.gap()) / step));
    this.goTo(this.activeIndex() + direction * visible);
  }

  goTo(index: number): void {
    const target = Math.min(Math.max(index, 0), this.slides().length - 1);
    this.track().nativeElement.scrollTo({ left: target * this.step() });
  }

  update(): void {
    const element = this.track().nativeElement;
    const max = element.scrollWidth - element.clientWidth;
    this.canPrev.set(element.scrollLeft > 4);
    this.canNext.set(element.scrollLeft < max - 4);
    const count = this.slides().length;
    if (count !== this.slideCount()) {
      this.slideCount.set(count);
      this.indexes.set(Array.from({ length: count }, (_, index) => index));
    }
    this.activeIndex.set(Math.min(count - 1, Math.max(0, Math.round(element.scrollLeft / this.step()))));
  }

  /** Distancia entre el inicio de dos diapositivas: ancho + separación. */
  private step(): number {
    return (this.slides()[0]?.offsetWidth ?? 0) + this.gap() || this.track().nativeElement.clientWidth || 1;
  }

  private gap(): number {
    return parseFloat(getComputedStyle(this.track().nativeElement).columnGap) || 0;
  }

  private slides(): HTMLElement[] {
    return Array.from(this.track().nativeElement.children) as HTMLElement[];
  }
}
