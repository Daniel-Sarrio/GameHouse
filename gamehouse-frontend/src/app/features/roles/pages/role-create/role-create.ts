import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatosRol } from '../../../../core/models/role.model';
import { RolesStore } from '../../../../core/stores/roles.store';
import { RoleFormPage } from '../../components/role-form-page/role-form-page';

@Component({
  selector: 'app-role-create',
  imports: [RoleFormPage],
  template: `
    <app-role-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class RoleCreate implements OnInit {
  protected readonly store = inject(RolesStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
  }

  async onGuardar(datos: DatosRol): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const resultado = await this.store.crearRol(datos);
      if (resultado) await this.router.navigate(['/roles', resultado.id]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/roles']);
  }
}
