import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosRol } from '../../../../core/models/role.model';
import { RolesStore } from '../../../../core/stores/roles.store';
import { RoleForm } from '../role-form/role-form';

@Component({
  selector: 'app-role-form-page',
  imports: [RouterLink, RoleForm, EstadoCarga, MensajeError],
  templateUrl: './role-form-page.html',
  styleUrl: './role-form-page.css',
})
export class RoleFormPage implements OnInit {
  protected readonly store = inject(RolesStore);
  private readonly router = inject(Router);
  readonly id = input<string>();
  protected readonly editando = computed(() => this.id() !== undefined);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.editando()) void this.store.cargarRol(Number(this.id()));
  }
  async onGuardar(datos: DatosRol): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const actual = this.store.rolActual();
      if (this.editando() && !actual) return;
      const result = this.editando() && actual
        ? await this.store.modificarRol(actual.id, datos)
        : await this.store.crearRol(datos);
      if (result) await this.router.navigate(['/roles', result.id]);
    } catch (error) { this.store.errorAccion.set((error as Error).message); }
  }
  onCancelar(): void { void this.router.navigate(['/roles']); }
  reintentar(): void { if (this.editando()) void this.store.cargarRol(Number(this.id())); }
}
