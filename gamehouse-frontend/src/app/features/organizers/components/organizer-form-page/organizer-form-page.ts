import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Organizador, DatosOrganizador } from '../../../../core/models/host.model';
import { OrganizerForm } from '../organizer-form/organizer-form';

@Component({
  selector: 'app-organizer-form-page',
  imports: [RouterLink, OrganizerForm, EstadoCarga, MensajeError],
  templateUrl: './organizer-form-page.html',
  styleUrl: './organizer-form-page.css',
})
export class OrganizerFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly organizador = input<Organizador | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosOrganizador>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
