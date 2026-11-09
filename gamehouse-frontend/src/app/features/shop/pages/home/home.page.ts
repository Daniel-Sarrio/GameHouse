import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { ShopStore } from '../../../../core/stores/shop.store';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { FacetCarousel } from '../../components/facet-carousel/facet-carousel';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, NgxSkeletonLoaderComponent, MensajeError, FacetCarousel],
  template: `
    <section class="hero">
      <div class="contenedor py-14 sm:py-20">
        <p class="text-xs font-bold tracking-[.2em] text-indigo-200 uppercase">GameHouse</p>
        <h1 class="mt-3 max-w-2xl text-4xl leading-tight font-black text-white sm:text-5xl">Vive experiencias gaming fuera de la pantalla</h1>
        <p class="mt-4 max-w-xl text-indigo-100">Torneos, realidad virtual, simuladores y escape rooms. Elige categoría, organizador o lugar y reserva tu fecha.</p>
        <a routerLink="/tienda" class="boton mt-8 bg-white text-indigo-700">Explorar experiencias →</a>
      </div>
    </section>

    <div class="contenedor flex flex-col gap-12 py-12">
      @if (store.facetsError(); as error) {
        <app-mensaje-error [mensaje]="error" (reintentar)="store.retryFacets()" />
      } @else if (store.facetsLoading()) {
        @for (section of [1, 2, 3]; track section) {
          <div aria-label="Cargando" class="grid grid-cols-2 gap-4 md:grid-cols-4">
            @for (card of [1, 2, 3, 4]; track card) {
              <ngx-skeleton-loader appearance="line" [theme]="{ height: '220px', borderRadius: '16px' }" />
            }
          </div>
        }
      } @else {
        @if (store.categories().length) {
          <app-facet-carousel title="Categorías" subtitle="Encuentra el tipo de experiencia que buscas." type="category" [facets]="store.categories()" />
        }
        @if (store.hosts().length) {
          <app-facet-carousel title="Organizadores" subtitle="Los equipos que preparan cada experiencia." type="host" [facets]="store.hosts()" />
        }
        @if (store.locations().length) {
          <app-facet-carousel title="Lugares" subtitle="Elige dónde quieres jugar." type="location" [facets]="store.locations()" />
        }
      }
    </div>
  `,
  styles: [`.hero { background: radial-gradient(circle at 85% 20%, #5b6cf0 0, transparent 45%), linear-gradient(135deg, #17213c, #2435ae); }`],
})
export class HomePage {
  readonly store = inject(ShopStore);

  constructor() {
    void this.store.loadFacets();
  }
}
