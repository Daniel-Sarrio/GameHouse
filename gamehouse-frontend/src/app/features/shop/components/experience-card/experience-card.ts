import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideCalendarDays, LucideMapPin, LucideUser } from '@lucide/angular';
import { ShopExperience } from '../../../../core/models/shop.model';
import { dateText, priceText } from '../../../../core/utils/shop.utils';
import { CoverImage } from '../../../../shared/components/cover-image/cover-image';

@Component({
  selector: 'app-experience-card',
  imports: [RouterLink, CoverImage, LucideCalendarDays, LucideMapPin, LucideUser],
  template: `
    <article class="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-superficie shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md">
      <app-cover-image class="aspect-[16/10]" [url]="experience().imageUrl" [alt]="'Imagen de ' + experience().name" />
      <div class="flex flex-1 flex-col gap-3 p-5">
        @if (experience().categories.length) {
          <ul class="m-0 flex list-none flex-wrap gap-1.5 p-0" aria-label="Categorías">
            @for (category of experience().categories; track category.id) {
              <li class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">{{ category.name }}</li>
            }
          </ul>
        }
        <h3 class="m-0 text-lg leading-snug font-bold text-slate-900">
          <!-- El enlace cubre toda la tarjeta (::after) sin anidar elementos interactivos. -->
          <a [routerLink]="['/tienda', experience().slug]" class="text-inherit no-underline after:absolute after:inset-0 group-hover:text-indigo-700">
            {{ experience().name }}
          </a>
        </h3>
        @if (experience().description) {
          <p class="m-0 line-clamp-2 text-sm text-slate-500">{{ experience().description }}</p>
        }
        <ul class="m-0 mt-auto flex list-none flex-col gap-1.5 p-0 text-sm text-slate-600">
          <li class="flex items-center gap-2"><svg lucideUser [size]="15" aria-hidden="true"></svg> {{ experience().host.name }}</li>
          <li class="flex items-center gap-2"><svg lucideMapPin [size]="15" aria-hidden="true"></svg> {{ locationsText() }}</li>
          <li class="flex items-center gap-2"><svg lucideCalendarDays [size]="15" aria-hidden="true"></svg> {{ nextDepartureText() }}</li>
        </ul>
        <div class="flex items-end justify-between border-t border-slate-100 pt-3">
          <span class="text-xs text-slate-500">{{ experience().minPrice === null ? '' : 'Desde' }}</span>
          <strong class="text-lg text-slate-900">{{ price() }}</strong>
        </div>
      </div>
    </article>
  `,
})
export class ExperienceCard {
  readonly experience = input.required<ShopExperience>();

  readonly price = computed(() => priceText(this.experience().minPrice));
  readonly locationsText = computed(() => {
    const locations = this.experience().locations;
    if (!locations.length) return 'Lugar por confirmar';
    return locations.length === 1 ? `${locations[0].name} · ${locations[0].city}` : `${locations.length} lugares`;
  });
  readonly nextDepartureText = computed(() => {
    const { nextDeparture, departureCount } = this.experience();
    if (!nextDeparture) return 'Sin fechas disponibles';
    return `${dateText(nextDeparture)}${departureCount > 1 ? ` · ${departureCount} fechas` : ''}`;
  });
}
