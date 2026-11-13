import { Component, DestroyRef, computed, effect, inject, input, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideCalendarDays, LucideMapPin, LucideTag, LucideUser } from '@lucide/angular';
import { NgxSkeletonLoaderComponent } from 'ngx-skeleton-loader';
import { ShopExperienceStore } from '../../../../core/stores/shop-experience.store';
import { ShopStore } from '../../../../core/stores/shop.store';
import { toShopQueryParams } from '../../../../core/utils/shop.utils';
import { Carousel } from '../../../../shared/components/carousel/carousel';
import { CoverImage } from '../../../../shared/components/cover-image/cover-image';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { BookingPanel } from '../../components/booking-panel/booking-panel';
import { DeparturePicker } from '../../components/departure-picker/departure-picker';

const parseId = (value: string | undefined): number | null => {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

@Component({
  selector: 'app-shop-experience-detail-page',
  imports: [
    RouterLink, NgxSkeletonLoaderComponent, LucideArrowLeft, LucideCalendarDays, LucideMapPin, LucideTag, LucideUser,
    Carousel, CoverImage, MensajeError, BookingPanel, DeparturePicker,
  ],
  template: `
    <section class="contenedor py-8 sm:py-10">
      <a routerLink="/tienda" [queryParams]="backQueryParams()" class="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-acento-texto no-underline hover:underline">
        <svg lucideArrowLeft [size]="16" aria-hidden="true"></svg> Volver a la tienda
      </a>

      @if (store.error(); as error) {
        <app-mensaje-error [mensaje]="error" (reintentar)="reload()" />
      } @else if (store.loading() || !store.experience()) {
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]" aria-label="Cargando experiencia">
          <ngx-skeleton-loader appearance="line" [theme]="{ height: '380px', borderRadius: '20px' }" />
          <ngx-skeleton-loader appearance="line" [theme]="{ height: '260px', borderRadius: '20px' }" />
        </div>
      } @else if (store.experience(); as experience) {
        <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div class="flex min-w-0 flex-col gap-8">
            @if (images().length) {
              <app-carousel [label]="'Imágenes de ' + experience.name" itemWidth="100%" [showArrows]="images().length > 1" [showIndicators]="true">
                @for (image of images(); track image; let index = $index) {
                  <app-cover-image class="aspect-[16/9] rounded-2xl" [url]="image" [eager]="index === 0"
                    [alt]="'Imagen ' + (index + 1) + ' de ' + experience.name" />
                }
              </app-carousel>
            } @else {
              <app-cover-image class="aspect-[16/9] rounded-2xl" [url]="null" [alt]="'Imagen de ' + experience.name" />
            }

            <header>
              <ul class="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Categorías">
                @for (category of experience.categories; track category.id) {
                  <li>
                    <a routerLink="/tienda" [queryParams]="{ category: category.id }"
                      class="flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 no-underline hover:bg-indigo-100">
                      <svg lucideTag [size]="12" aria-hidden="true"></svg>{{ category.name }}
                    </a>
                  </li>
                }
              </ul>
              <h1 class="mt-3 text-3xl leading-tight font-bold sm:text-4xl">{{ experience.name }}</h1>
              <dl class="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
                <div class="flex items-start gap-2"><svg lucideUser [size]="16" aria-hidden="true" class="mt-0.5 shrink-0"></svg>
                  <div><dt class="sr-only">Organizador</dt>
                    <dd class="m-0"><a routerLink="/tienda" [queryParams]="{ host: experience.host.id }" class="font-semibold text-slate-800 hover:text-indigo-700">{{ experience.host.name }}</a></dd></div>
                </div>
                <div class="flex items-start gap-2"><svg lucideMapPin [size]="16" aria-hidden="true" class="mt-0.5 shrink-0"></svg>
                  <div><dt class="sr-only">Lugares</dt>
                    <dd class="m-0">
                      @for (location of experience.locations; track location.id; let last = $last) {
                        <a routerLink="/tienda" [queryParams]="{ location: location.id }" class="hover:text-indigo-700">{{ location.name }}, {{ location.city }}</a>@if (!last) {<span> · </span>}
                      } @empty { Lugar por confirmar }
                    </dd></div>
                </div>
                <div class="flex items-start gap-2"><svg lucideCalendarDays [size]="16" aria-hidden="true" class="mt-0.5 shrink-0"></svg>
                  <div><dt class="sr-only">Fechas</dt>
                    <dd class="m-0">{{ experience.departureCount }} {{ experience.departureCount === 1 ? 'fecha disponible' : 'fechas disponibles' }}</dd></div>
                </div>
              </dl>
            </header>

            @if (experience.description) {
              <section>
                <h2 class="mb-2 text-lg font-bold">Sobre la experiencia</h2>
                <p class="m-0 leading-7 whitespace-pre-line text-slate-600">{{ experience.description }}</p>
              </section>
            }

            <app-departure-picker [departures]="store.departures()" [selectedId]="store.selectedDepartureId()"
              (departureSelect)="selectDeparture($event)" />

            @if (experience.host.description) {
              <section class="rounded-2xl border border-slate-200 bg-superficie p-5">
                <h2 class="m-0 text-base font-bold">Organiza {{ experience.host.name }}</h2>
                <p class="mt-2 mb-0 text-sm text-slate-600">{{ experience.host.description }}</p>
              </section>
            }
          </div>

          <div class="lg:sticky lg:top-24 lg:self-start">
            <app-booking-panel [departure]="store.selectedDeparture()" [minPrice]="experience.minPrice"
              [spots]="store.spots()" [total]="store.total()" (spotsChange)="store.setSpots($event)" />
          </div>
        </div>
      }
    </section>
  `,
})
export class ShopExperienceDetailPage {
  /** Parámetro de ruta :slug y query param ?fecha (departure seleccionada), vía input binding. */
  readonly slug = input.required<string>();
  readonly fecha = input<string>();

  readonly store = inject(ShopExperienceStore);
  private readonly shop = inject(ShopStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly images = computed(() => this.store.experience()?.images ?? []);
  // Volver conserva los filtros con los que se llegó desde el shop.
  readonly backQueryParams = computed(() => {
    const params = toShopQueryParams(this.shop.filters());
    return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== null));
  });

  constructor() {
    // Solo el slug provoca la carga; la fecha preseleccionada se lee sin crear dependencia.
    effect(() => {
      const slug = this.slug();
      untracked(() => void this.store.load(slug, parseId(this.fecha())));
    });
    inject(DestroyRef).onDestroy(() => this.store.cancel());
  }

  selectDeparture(id: number): void {
    this.store.selectDeparture(id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fecha: id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      scroll: 'manual',
    });
  }

  reload(): void {
    void this.store.load(this.slug(), this.store.selectedDepartureId());
  }
}
