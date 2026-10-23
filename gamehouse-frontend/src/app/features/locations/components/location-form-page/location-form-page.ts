import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Lugar, DatosLugar } from '../../../../core/models/location.model';
import { LocationForm } from '../location-form/location-form';

@Component({
  selector: 'app-location-form-page',
  imports: [RouterLink, LocationForm, EstadoCarga, MensajeError],
  templateUrl: './location-form-page.html',
  styleUrl: './location-form-page.css',
})
export class LocationFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly lugar = input<Lugar | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosLugar>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
