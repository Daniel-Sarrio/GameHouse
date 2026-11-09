import { Component, computed, input, output } from '@angular/core';
import { SHOP_SORTS, SHOP_SORT_LABELS, ShopFacet, ShopFilters, ShopSort } from '../../../../core/models/shop.model';
import { FilterGroup, FilterOption } from '../../../../shared/components/filter-group/filter-group';

const toOptions = (facets: ShopFacet[], withLocation = false): FilterOption[] =>
  facets.map((facet) => ({
    id: facet.id,
    label: facet.name,
    count: facet.experienceCount,
    hint: withLocation ? [facet.city, facet.country].filter(Boolean).join(', ') : undefined,
  }));

/** Panel de filtros del shop: compone tres FilterGroup y el orden. No conoce la URL ni la API. */
@Component({
  selector: 'app-shop-filters',
  imports: [FilterGroup],
  template: `
    <div class="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex items-center justify-between">
        <h2 class="m-0 text-base font-bold">Filtros</h2>
        @if (activeCount()) {
          <button type="button" class="text-xs font-semibold text-indigo-600 hover:underline" (click)="clear.emit()">
            Limpiar todo ({{ activeCount() }})
          </button>
        }
      </div>

      <label class="flex flex-col gap-1.5 text-sm font-bold text-slate-900">
        Ordenar por
        <select class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal" [value]="filters().sort"
          (change)="filtersChange.emit({ sort: $any($event.target).value })">
          @for (sort of sorts; track sort) {
            <option [value]="sort" [selected]="sort === filters().sort">{{ sortLabels[sort] }}</option>
          }
        </select>
      </label>

      <app-filter-group title="Categorías" [options]="categoryOptions()" [selected]="filters().category"
        (selectedChange)="filtersChange.emit({ category: $event })" />
      <app-filter-group title="Organizadores" [options]="hostOptions()" [selected]="filters().host"
        (selectedChange)="filtersChange.emit({ host: $event })" />
      <app-filter-group title="Lugares" [options]="locationOptions()" [selected]="filters().location"
        (selectedChange)="filtersChange.emit({ location: $event })" />
    </div>
  `,
})
export class ShopFiltersPanel {
  readonly filters = input.required<ShopFilters>();
  readonly categories = input.required<ShopFacet[]>();
  readonly hosts = input.required<ShopFacet[]>();
  readonly locations = input.required<ShopFacet[]>();
  readonly activeCount = input(0);
  readonly filtersChange = output<Partial<ShopFilters>>();
  readonly clear = output<void>();

  readonly sorts: readonly ShopSort[] = SHOP_SORTS;
  readonly sortLabels = SHOP_SORT_LABELS;
  readonly categoryOptions = computed(() => toOptions(this.categories()));
  readonly hostOptions = computed(() => toOptions(this.hosts()));
  readonly locationOptions = computed(() => toOptions(this.locations(), true));
}
