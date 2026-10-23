import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatosLugar } from '../../../../core/models/location.model';
import { LugaresStore } from '../../../../core/stores/locations.store';
import { LocationFormPage } from '../../components/location-form-page/location-form-page';

@Component({
  selector: 'app-location-create',
  imports: [LocationFormPage],
  template: `
    <app-location-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class LocationCreate implements OnInit {
  protected readonly store = inject(LugaresStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
  }

  async onGuardar(datos: DatosLugar): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const resultado = await this.store.crearLugar(datos);
      if (resultado) await this.router.navigate(['/lugares', resultado.id]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/lugares']);
  }
}
