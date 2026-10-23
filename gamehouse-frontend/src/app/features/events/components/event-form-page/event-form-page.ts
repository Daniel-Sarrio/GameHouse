import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Celebracion, DatosCelebracion, OpcionesCelebracion } from '../../../../core/models/event.model';
import { EventForm } from '../event-form/event-form';

@Component({
  selector: 'app-event-form-page',
  imports: [RouterLink, EventForm, EstadoCarga, MensajeError],
  templateUrl: './event-form-page.html',
  styleUrl: './event-form-page.css',
})
export class EventFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly celebracion = input<Celebracion | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly opciones = input<OpcionesCelebracion>({ experiences: [], locations: [], categories: [] });
  readonly cargandoOpciones = input(false);
  readonly errorOpciones = input<string | null>(null);
  readonly reintentarOpciones = output<void>();
  readonly guardar = output<DatosCelebracion>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
