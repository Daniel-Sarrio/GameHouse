import { Component, OnInit, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatosRol } from '../../../../core/models/role.model';
import { RolesStore } from '../../../../core/stores/roles.store';
import { RoleFormPage } from '../../components/role-form-page/role-form-page';

@Component({
  selector: 'app-role-edit',
  imports: [RoleFormPage],
  template: `
    <app-role-form-page
      [editando]="true"
      [rol]="store.rolActual()"
      [cargando]="store.cargandoDetalle()"
      [errorCarga]="store.errorDetalle()"
      (reintentar)="cargarDatos()"
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class RoleEdit implements OnInit {
  protected readonly store = inject(RolesStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    await this.store.cargarRol(Number(this.id()));
  }

  async onGuardar(datos: DatosRol): Promise<void> {
    if (this.store.guardando()) return;
    const actual = this.store.rolActual();
    if (!actual) return;
    try {
      const resultado = await this.store.modificarRol(actual.id, datos);
      if (resultado) await this.router.navigate(['/roles', resultado.id]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/roles']);
  }
}
