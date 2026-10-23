import { Component, OnInit, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatosOrganizador } from '../../../../core/models/host.model';
import { OrganizadoresStore } from '../../../../core/stores/hosts.store';
import { OrganizerFormPage } from '../../components/organizer-form-page/organizer-form-page';

@Component({
  selector: 'app-organizer-edit',
  imports: [OrganizerFormPage],
  template: `
    <app-organizer-form-page
      [editando]="true"
      [organizador]="store.organizadorActual()"
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
export class OrganizerEdit implements OnInit {
  protected readonly store = inject(OrganizadoresStore);
  private readonly router = inject(Router);
  readonly slug = input.required<string>();

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    await this.store.cargarOrganizador(this.slug());
  }

  async onGuardar(datos: DatosOrganizador): Promise<void> {
    if (this.store.guardando()) return;
    const actual = this.store.organizadorActual();
    if (!actual) return;
    try {
      const resultado = await this.store.modificarOrganizador(actual.id, datos);
      if (resultado) await this.router.navigate(['/organizadores', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/organizadores', this.slug()]);
  }
}
