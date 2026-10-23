import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Asignacion, DatosAsignacion, OpcionesAsignacion } from '../../../../core/models/assignment.model';
import { AssignmentForm } from '../assignment-form/assignment-form';

@Component({
  selector: 'app-assignment-form-page',
  imports: [RouterLink, AssignmentForm, EstadoCarga, MensajeError],
  templateUrl: './assignment-form-page.html',
  styleUrl: './assignment-form-page.css',
})
export class AssignmentFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly asignacion = input<Asignacion | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly opciones = input<OpcionesAsignacion>({ experiencias: [], categorias: [] });
  readonly cargandoOpciones = input(false);
  readonly errorOpciones = input<string | null>(null);
  readonly reintentarOpciones = output<void>();
  readonly guardar = output<DatosAsignacion>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
