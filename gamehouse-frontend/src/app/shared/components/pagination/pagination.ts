import { Component, computed, input, output } from '@angular/core';
import { LucideChevronLeft, LucideChevronRight } from '@lucide/angular';

type PageItem = number | 'gap';

/** Paginación reutilizable: muestra la primera, la última y las páginas cercanas a la actual. */
@Component({
  selector: 'app-pagination',
  imports: [LucideChevronLeft, LucideChevronRight],
  template: `
    @if (totalPages() > 1) {
      <nav class="flex flex-wrap items-center justify-center gap-1.5" [attr.aria-label]="label()">
        <button type="button" class="page" [disabled]="page() <= 1" (click)="go(page() - 1)" aria-label="Página anterior">
          <svg lucideChevronLeft [size]="16" aria-hidden="true"></svg>
        </button>
        @for (item of items(); track $index) {
          @if (item === 'gap') {
            <span class="px-1 text-slate-400" aria-hidden="true">…</span>
          } @else {
            <button type="button" class="page" [class.current]="item === page()" [attr.aria-current]="item === page() ? 'page' : null"
              (click)="go(item)" [attr.aria-label]="'Página ' + item">{{ item }}</button>
          }
        }
        <button type="button" class="page" [disabled]="page() >= totalPages()" (click)="go(page() + 1)" aria-label="Página siguiente">
          <svg lucideChevronRight [size]="16" aria-hidden="true"></svg>
        </button>
      </nav>
    }
  `,
  styles: [`
    .page {
      display: inline-grid; place-items: center; min-width: 2.4rem; height: 2.4rem; padding: 0 .6rem;
      border: 1px solid var(--borde); border-radius: 10px; background: #fff; color: var(--tinta);
      font-size: .875rem; font-weight: 650;
    }
    .page:hover:not(:disabled):not(.current) { background: #eff1f6; }
    .page:disabled { opacity: .45; cursor: not-allowed; }
    .page.current { background: var(--azul); border-color: var(--azul); color: #fff; }
  `],
})
export class Pagination {
  readonly page = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly label = input('Paginación');
  readonly pageChange = output<number>();

  readonly items = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = Math.min(Math.max(this.page(), 1), total);
    const pages = [...new Set([1, current - 1, current, current + 1, total])]
      .filter((value) => value >= 1 && value <= total)
      .sort((a, b) => a - b);
    return pages.flatMap((value, index) => (index && value - pages[index - 1] > 1 ? ['gap' as const, value] : [value]));
  });

  go(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) this.pageChange.emit(page);
  }
}
