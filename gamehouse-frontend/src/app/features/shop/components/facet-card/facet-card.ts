import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopFacet, ShopFacetType } from '../../../../core/models/shop.model';
import { CoverImage } from '../../../../shared/components/cover-image/cover-image';

/** Tarjeta de categoría, organizador o lugar. Enlaza al shop con ese filtro ya aplicado. */
@Component({
  selector: 'app-facet-card',
  imports: [RouterLink, CoverImage],
  template: `
    <a [routerLink]="['/tienda']" [queryParams]="queryParams()"
      class="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-superficie no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
      <app-cover-image class="aspect-[4/3]" [url]="facet().imageUrl" [alt]="'Imagen de ' + facet().name" />
      <span class="flex flex-1 flex-col gap-1 p-4">
        <span class="text-xs font-bold tracking-widest text-acento-texto uppercase">{{ typeLabel() }}</span>
        <strong class="text-base leading-snug text-slate-900 group-hover:text-indigo-700">{{ facet().name }}</strong>
        @if (subtitle()) { <span class="text-sm text-slate-500">{{ subtitle() }}</span> }
        <span class="mt-auto pt-2 text-xs font-semibold text-slate-400">
          {{ facet().experienceCount }} {{ facet().experienceCount === 1 ? 'experiencia' : 'experiencias' }}
        </span>
      </span>
    </a>
  `,
})
export class FacetCard {
  readonly facet = input.required<ShopFacet>();
  readonly type = input.required<ShopFacetType>();

  readonly queryParams = computed(() => ({ [this.type()]: this.facet().id }));
  readonly typeLabel = computed(() => ({ category: 'Categoría', host: 'Organizador', location: 'Lugar' })[this.type()]);
  readonly subtitle = computed(() => {
    const facet = this.facet();
    return this.type() === 'location' ? [facet.city, facet.country].filter(Boolean).join(', ') : facet.description;
  });
}
