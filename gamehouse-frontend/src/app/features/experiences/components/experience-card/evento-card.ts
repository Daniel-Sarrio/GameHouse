import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePower, LucideMapPin } from '@lucide/angular';
import { Evento } from '../../../../core/models/experience.model';
import { precioTexto } from '../../../../core/utils/experience.utils';
import { EventosStore } from '../../../../core/stores/experiences.store';

@Component({
  selector: 'app-evento-card',
  imports: [RouterLink, LucideEye, LucidePencil, LucidePower, LucideMapPin],
  templateUrl: './evento-card.html',
  styleUrl: './evento-card.css',
})
export class EventoCard {
  readonly evento = input.required<Evento>();
  protected readonly store = inject(EventosStore);
  protected readonly precio = computed(() => precioTexto(this.evento().price, this.evento().currency));

  async cambiarEstado(): Promise<void> {
    if (this.store.guardando()) return;
    await this.store.cambiarEstado(this.evento().id, !this.evento().isActive);
  }
}
