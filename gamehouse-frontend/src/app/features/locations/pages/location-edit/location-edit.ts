import { Component, OnInit, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { DatosLugar } from '../../../../core/models/location.model';
import { LugaresStore } from '../../../../core/stores/locations.store';
import { LocationFormPage } from '../../components/location-form-page/location-form-page';

@Component({
  selector: 'app-location-edit',
  imports: [LocationFormPage],
  template: `
    <app-location-form-page
      [editando]="true"
      [lugar]="store.lugarActual()"
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
export class LocationEdit implements OnInit {
  protected readonly store = inject(LugaresStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarDatos();
  }

  async cargarDatos(): Promise<void> {
    await this.store.cargarLugar(Number(this.id()));
  }

  async onGuardar(datos: DatosLugar): Promise<void> {
    if (this.store.guardando()) return;
    const actual = this.store.lugarActual();
    if (!actual) return;
    try {
      const resultado = await this.store.modificarLugar(actual.id, datos);
      if (resultado) await this.router.navigate(['/lugares', resultado.id]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/lugares']);
  }
}
