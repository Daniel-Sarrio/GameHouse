import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LucideSlidersHorizontal, LucideX } from '@lucide/angular';
import { DEFAULT_SHOP_FILTERS, ShopFacetType, ShopFilters } from '../../../../core/models/shop.model';
import { ShopStore } from '../../../../core/stores/shop.store';
import { parseShopFilters, toShopQueryParams } from '../../../../core/utils/shop.utils';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Pagination } from '../../../../shared/components/pagination/pagination';
import { SearchBox } from '../../../../shared/components/search-box/search-box';
import { SkeletonLoader } from '../../../../shared/components/skeleton-loader/skeleton-loader';
import { ExperienceList } from '../../components/experience-list/experience-list';
import { ShopFiltersPanel } from '../../components/shop-filters/shop-filters';

interface ActiveChip {
  type: ShopFacetType;
  id: number;
  label: string;
}

/**
 * La URL es la única fuente de verdad: cada cambio de filtros, búsqueda o página navega con
 * nuevos query params y la suscripción a queryParamMap actualiza el store y lanza la búsqueda.
 * Así funcionan el deep-linking desde el home, recargar la página y atrás/adelante.
 */
@Component({
  selector: 'app-shop-page',
  imports: [LucideSlidersHorizontal, LucideX, EmptyState, MensajeError, Pagination, SearchBox, SkeletonLoader, ExperienceList, ShopFiltersPanel],
  template: `
    <section class="contenedor py-8 sm:py-10">
      <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-bold tracking-widest text-acento-texto uppercase">Tienda</p>
          <h1 class="mt-1 text-3xl font-bold">Explora experiencias</h1>
          <p class="mt-1 text-sm text-slate-500" aria-live="polite">{{ resultsText() }}</p>
        </div>
        <div class="w-full sm:max-w-sm">
          <app-search-box inputId="shop-search" label="Buscar experiencias por nombre" placeholder="Buscar por nombre…"
            [value]="store.filters().search" (search)="update({ search: $event })" />
        </div>
      </header>

      @if (chips().length) {
        <ul class="mb-6 flex list-none flex-wrap gap-2 p-0" aria-label="Filtros activos">
          @for (chip of chips(); track chip.type + chip.id) {
            <li>
              <button type="button" class="flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
                (click)="removeChip(chip)" [attr.aria-label]="'Quitar filtro ' + chip.label">
                {{ chip.label }} <svg lucideX [size]="14" aria-hidden="true"></svg>
              </button>
            </li>
          }
        </ul>
      }

      <div class="grid gap-8 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div>
          <!-- En móvil los filtros se pliegan para no empujar los resultados. -->
          <button type="button" class="boton boton-secundario mb-3 w-full lg:hidden" (click)="filtersOpen.update((open) => !open)"
            [attr.aria-expanded]="filtersOpen()" aria-controls="shop-filters">
            <svg lucideSlidersHorizontal [size]="16" aria-hidden="true"></svg>
            {{ filtersOpen() ? 'Ocultar filtros' : 'Mostrar filtros' }}{{ store.activeFilterCount() ? ' (' + store.activeFilterCount() + ')' : '' }}
          </button>
          <app-shop-filters id="shop-filters" class="lg:block" [class.hidden]="!filtersOpen()"
            [filters]="store.filters()" [categories]="store.categories()" [hosts]="store.hosts()"
            [locations]="store.locations()" [activeCount]="store.activeFilterCount()"
            (filtersChange)="update($event)" (clear)="clearFilters()" />
        </div>

        <div class="min-w-0" [attr.aria-busy]="store.loading()">
          @if (store.error(); as error) {
            <app-mensaje-error [mensaje]="error" (reintentar)="reload()" />
          } @else if (store.loading() && !store.experiences().length) {
            <app-skeleton-loader />
          } @else if (!store.experiences().length) {
            @if (outOfRange()) {
              <app-empty-state title="Esta página no existe" description="No hay tantas páginas de resultados con estos filtros."
                actionLabel="Ir a la primera página" (action)="goToPage(1)" />
            } @else {
              <app-empty-state title="No hay experiencias" description="Prueba con otra búsqueda o quita algún filtro."
                [actionLabel]="store.activeFilterCount() ? 'Limpiar filtros' : undefined" (action)="clearFilters()" />
            }
          } @else {
            <div class="transition-opacity" [class.opacity-60]="store.loading()">
              <app-experience-list [experiences]="store.experiences()" />
            </div>
            @if (store.pagination(); as pagination) {
              <div class="mt-10">
                <app-pagination [page]="pagination.page" [totalPages]="pagination.totalPages" (pageChange)="goToPage($event)" />
              </div>
            }
          }
        </div>
      </div>
    </section>
  `,
})
export class ShopPage {
  readonly store = inject(ShopStore);
  readonly filtersOpen = signal(false);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly resultsText = computed(() => {
    const pagination = this.store.pagination();
    if (!pagination) return this.store.loading() ? 'Buscando experiencias…' : '';
    return `${pagination.total} ${pagination.total === 1 ? 'experiencia encontrada' : 'experiencias encontradas'}`;
  });

  readonly outOfRange = computed(() => {
    const pagination = this.store.pagination();
    return !!pagination && pagination.total > 0 && pagination.page > pagination.totalPages;
  });

  readonly chips = computed<ActiveChip[]>(() => {
    const filters = this.store.filters();
    const build = (type: ShopFacetType, ids: number[], facets: { id: number; name: string }[]) =>
      ids.map((id) => ({ type, id, label: facets.find((facet) => facet.id === id)?.name ?? `#${id}` }));
    return [
      ...build('category', filters.category, this.store.categories()),
      ...build('host', filters.host, this.store.hosts()),
      ...build('location', filters.location, this.store.locations()),
    ];
  });

  constructor() {
    void this.store.loadFacets();
    this.route.queryParamMap
      .pipe(takeUntilDestroyed())
      .subscribe((params) => void this.store.loadExperiences(parseShopFilters(params)));
    // Al salir del shop se cancela la petición pendiente.
    inject(DestroyRef).onDestroy(() => this.store.cancel());
  }

  /** Cambiar filtros, búsqueda u orden vuelve a la página 1 sin mover el scroll. */
  update(changes: Partial<ShopFilters>): void {
    this.navigate({ ...changes, page: 1 }, { replaceUrl: changes.search !== undefined, scroll: 'manual' });
  }

  goToPage(page: number): void {
    this.navigate({ page });
  }

  clearFilters(): void {
    this.navigate(DEFAULT_SHOP_FILTERS, { scroll: 'manual' });
  }

  removeChip(chip: ActiveChip): void {
    this.update({ [chip.type]: this.store.filters()[chip.type].filter((id) => id !== chip.id) });
  }

  reload(): void {
    void this.store.loadExperiences(this.store.filters());
  }

  private navigate(filters: Partial<ShopFilters>, extras: { replaceUrl?: boolean; scroll?: 'manual' } = {}): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toShopQueryParams(filters),
      queryParamsHandling: 'merge',
      ...extras,
    });
  }
}
