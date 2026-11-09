import { Component, input, output } from '@angular/core';
import { LucideMapPin, LucideUsers } from '@lucide/angular';
import { Departure } from '../../../../core/models/shop.model';
import { dateText, priceText, timeRangeText } from '../../../../core/utils/shop.utils';

/** Lista de departures seleccionables (radio): fechas, lugar, plazas y precio. */
@Component({
  selector: 'app-departure-picker',
  imports: [LucideMapPin, LucideUsers],
  template: `
    <fieldset class="m-0 border-0 p-0">
      <legend class="mb-3 text-lg font-bold text-slate-900">Elige una fecha</legend>
      @if (!departures().length) {
        <p class="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          No hay fechas programadas para esta experiencia. Vuelve a consultarla más adelante.
        </p>
      }
      <ul class="m-0 flex list-none flex-col gap-3 p-0">
        @for (departure of departures(); track departure.id) {
          <li>
            <label class="option" [class.selected]="departure.id === selectedId()" [class.full]="!departure.availableSpots">
              <input type="radio" name="departure" class="sr-only" [value]="departure.id" [disabled]="!departure.availableSpots"
                [checked]="departure.id === selectedId()" (change)="departureSelect.emit(departure.id)" />
              <span class="min-w-0 flex-1">
                <strong class="block text-slate-900 first-letter:uppercase">{{ date(departure.startDatetime) }}</strong>
                <span class="block text-sm text-slate-500">{{ time(departure.startDatetime, departure.endDatetime) }}</span>
                <span class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span class="flex items-center gap-1"><svg lucideMapPin [size]="13" aria-hidden="true"></svg>{{ departure.location.name }}, {{ departure.location.city }}</span>
                  <span class="flex items-center gap-1"><svg lucideUsers [size]="13" aria-hidden="true"></svg>{{ departure.availableSpots }} / {{ departure.capacity }} plazas</span>
                </span>
              </span>
              <strong class="text-lg text-slate-900">{{ price(departure.price) }}</strong>
            </label>
          </li>
        }
      </ul>
    </fieldset>
  `,
  styles: [`
    .option {
      display: flex; align-items: center; gap: 1rem; padding: 1rem 1.1rem; cursor: pointer;
      border: 1.5px solid var(--borde); border-radius: 14px; background: #fff; transition: border-color .15s, box-shadow .15s;
    }
    .option:hover { border-color: #aab4f5; }
    .option:has(input:focus-visible) { outline: 3px solid #8d9aff; outline-offset: 2px; }
    .option.selected { border-color: var(--azul); box-shadow: 0 0 0 3px rgb(52 72 220 / .12); }
    .option.full { opacity: .55; cursor: not-allowed; }
  `],
})
export class DeparturePicker {
  readonly departures = input.required<Departure[]>();
  readonly selectedId = input<number | null>(null);
  readonly departureSelect = output<number>();

  readonly date = dateText;
  readonly time = timeRangeText;
  readonly price = priceText;
}
