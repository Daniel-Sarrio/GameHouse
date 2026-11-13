import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ShopFacet, ShopFacetType } from '../../../../core/models/shop.model';
import { Carousel } from '../../../../shared/components/carousel/carousel';
import { FacetCard } from '../facet-card/facet-card';

/** Lista (carrusel) + Card: un carrusel del home para un tipo de faceta. */
@Component({
  selector: 'app-facet-carousel',
  imports: [Carousel, FacetCard, RouterLink],
  template: `
    <app-carousel [label]="title()" [title]="title()" [subtitle]="subtitle()" itemWidth="min(15rem, 78vw)">
      <a carouselAction routerLink="/tienda" class="mr-1 text-sm font-semibold text-acento-texto no-underline hover:underline">Ver todo</a>
      @for (facet of facets(); track facet.id) {
        <app-facet-card [facet]="facet" [type]="type()" />
      }
    </app-carousel>
  `,
})
export class FacetCarousel {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly type = input.required<ShopFacetType>();
  readonly facets = input.required<ShopFacet[]>();
}
