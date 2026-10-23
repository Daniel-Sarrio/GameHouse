import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { Rol, DatosRol } from '../../../../core/models/role.model';
import { RoleForm } from '../role-form/role-form';

@Component({
  selector: 'app-role-form-page',
  imports: [RouterLink, RoleForm, EstadoCarga, MensajeError],
  templateUrl: './role-form-page.html',
  styleUrl: './role-form-page.css',
})
export class RoleFormPage {
  // Solo presentación: los datos y las acciones los controla la page.
  readonly editando = input(false);
  readonly rol = input<Rol | null>(null);
  readonly cargando = input(false);
  readonly errorCarga = input<string | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosRol>();
  readonly cancelar = output<void>();
  readonly reintentar = output<void>();
}
