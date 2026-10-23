import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Evento, DatosEvento, OpcionesEvento } from '../../../../core/models/experience.model';
import { EventoForm } from '../experience-form/evento-form';

@Component({
  selector: 'app-evento-form-page',
  imports: [RouterLink, EventoForm, EstadoCarga, MensajeError],
  templateUrl: './evento-form-page.html',
  styleUrl: './evento-form-page.css',
})
export class EventoFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly evento = input<Evento | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly opciones = input<OpcionesEvento>({ hosts: [], categories: [] });
  readonly cargandoOpciones = input(false);
  readonly errorOpciones = input<string | null>(null);
  readonly reintentarOpciones = output<void>();
  readonly guardar = output<DatosEvento>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
