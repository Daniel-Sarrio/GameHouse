import { Component, input, output } from '@angular/core';
import { Departure } from '../../../../core/models/shop.model';
import { dateText, priceText, timeRangeText } from '../../../../core/utils/shop.utils';

/**
 * Resumen de la reserva. El sistema de reservas llegará en otra fase: este panel ya recibe
 * la departure, las plazas y el total, y solo tendrá que emitir `book` hacia el futuro servicio.
 */
@Component({
  selector: 'app-booking-panel',
  template: `
    <aside class="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Resumen de reserva">
      <div>
        <span class="text-xs text-slate-500">{{ departure() ? 'Precio por plaza' : 'Desde' }}</span>
        <p class="m-0 text-2xl font-bold text-slate-900">{{ price(departure()?.price ?? minPrice()) }}</p>
      </div>

      @if (departure(); as selected) {
        <div class="rounded-xl bg-slate-50 p-3 text-sm">
          <strong class="block first-letter:uppercase">{{ date(selected.startDatetime) }}</strong>
          <span class="text-slate-500">{{ time(selected.startDatetime, selected.endDatetime) }} · {{ selected.location.name }}</span>
        </div>
        <label class="flex items-center justify-between gap-3 text-sm font-semibold">
          Plazas
          <input type="number" min="1" [max]="selected.availableSpots" [value]="spots()" inputmode="numeric"
            class="w-20 rounded-lg border border-slate-200 px-3 py-2 text-right"
            (change)="spotsChange.emit(+$any($event.target).value)" />
        </label>
        <div class="flex items-center justify-between border-t border-slate-100 pt-3">
          <span class="text-sm text-slate-500">Total</span>
          <strong class="text-xl">{{ price(total()) }}</strong>
        </div>
      } @else {
        <p class="m-0 text-sm text-slate-500">Selecciona una fecha para ver el resumen.</p>
      }

      <button type="button" class="boton boton-primario w-full" [disabled]="!departure() || !bookingEnabled()" (click)="book.emit()">
        Reservar
      </button>
      @if (!bookingEnabled()) {
        <p class="m-0 text-center text-xs text-slate-400">Las reservas online estarán disponibles próximamente.</p>
      }
    </aside>
  `,
})
export class BookingPanel {
  readonly departure = input<Departure | null>(null);
  readonly minPrice = input<number | null>(null);
  readonly spots = input(1);
  readonly total = input(0);
  readonly bookingEnabled = input(false);
  readonly spotsChange = output<number>();
  readonly book = output<void>();

  readonly date = dateText;
  readonly time = timeRangeText;
  readonly price = priceText;
}
