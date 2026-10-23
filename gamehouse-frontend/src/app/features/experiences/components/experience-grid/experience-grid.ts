import { Component, input, output } from '@angular/core';
import { Evento } from '../../../../core/models/experience.model';
import { EventoCard } from '../experience-card/evento-card';

@Component({
  selector: 'app-experience-grid',
  imports: [EventoCard],
  template: `<div class="lista">@for (evento of eventos(); track evento.id) { <app-evento-card [evento]="evento" [guardando]="guardando()" (cambiarEstado)="cambiarEstado.emit($event)" /> }</div>`,
  styles: [`.lista { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); gap: 1.1rem; }`],
})
export class ExperienceGrid {
  readonly guardando = input(false);
  readonly cambiarEstado = output<Evento>();
  readonly eventos = input.required<Evento[]>();
}
