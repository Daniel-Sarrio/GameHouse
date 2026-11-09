import { Injectable, computed, inject, signal } from '@angular/core';
import { BookingDraft, Departure, ShopExperienceDetail } from '../models/shop.model';
import { isAbortError } from '../services/api.service';
import { ShopService } from '../services/shop.service';

/** Estado del detalle de una experiencia y de la departure elegida para reservar. */
@Injectable({ providedIn: 'root' })
export class ShopExperienceStore {
  private readonly service = inject(ShopService);
  private controller?: AbortController;

  readonly experience = signal<ShopExperienceDetail | null>(null);
  readonly departures = signal<Departure[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedDepartureId = signal<number | null>(null);
  readonly spots = signal(1);

  readonly selectedDeparture = computed(
    () => this.departures().find((departure) => departure.id === this.selectedDepartureId()) ?? null,
  );

  /** Punto de integración del sistema de reservas: datos listos para enviar. */
  readonly bookingDraft = computed<BookingDraft | null>(() => {
    const experience = this.experience();
    const departure = this.selectedDeparture();
    if (!experience || !departure || this.spots() > departure.availableSpots) return null;
    return { experienceSlug: experience.slug, departureId: departure.id, spots: this.spots() };
  });

  readonly total = computed(() => (this.selectedDeparture()?.price ?? 0) * this.spots());

  async load(slug: string, preselectedDepartureId: number | null = null): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    this.experience.set(null);
    this.departures.set([]);
    this.selectedDepartureId.set(null);
    this.spots.set(1);
    this.loading.set(true);
    this.error.set(null);
    try {
      const [experience, departures] = await Promise.all([
        this.service.getExperience(slug, controller.signal),
        this.service.getDepartures(slug, controller.signal),
      ]);
      this.experience.set(experience);
      this.departures.set(departures);
      this.selectDeparture(preselectedDepartureId);
    } catch (error) {
      if (isAbortError(error)) return;
      this.error.set(error instanceof Error ? error.message : 'No se pudo cargar la experiencia.');
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }

  /** Solo acepta departures de esta experiencia; un ID desconocido deja la selección vacía. */
  selectDeparture(id: number | null): void {
    const departure = this.departures().find((item) => item.id === id) ?? null;
    this.selectedDepartureId.set(departure?.id ?? null);
    this.spots.set(1);
  }

  setSpots(value: number): void {
    const max = this.selectedDeparture()?.availableSpots ?? 1;
    this.spots.set(Number.isSafeInteger(value) ? Math.min(Math.max(value, 1), Math.max(max, 1)) : 1);
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.loading.set(false);
  }
}
