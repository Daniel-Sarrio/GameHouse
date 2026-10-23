import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideEye, LucidePencil, LucidePower } from '@lucide/angular';
import { Evento } from '../../../../core/models/experience.model';
@Component({
  selector: 'app-evento-card',
  imports: [RouterLink, LucideEye, LucidePencil, LucidePower],
  templateUrl: './evento-card.html',
  styleUrl: './evento-card.css',
})
export class EventoCard {
  readonly evento = input.required<Evento>();
  readonly guardando = input(false);
  readonly cambiarEstado = output<Evento>();
}
