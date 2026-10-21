import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosLugar } from '../../../../core/models/location.model';
import { LugaresStore } from '../../../../core/stores/locations.store';
import { LocationForm } from '../location-form/location-form';
@Component({
  selector: 'app-location-form-page',
  imports: [RouterLink, LocationForm, EstadoCarga, MensajeError],
  templateUrl: './location-form-page.html',
  styleUrl: './location-form-page.css',
})
export class LocationFormPage implements OnInit {
  protected readonly store = inject(LugaresStore);
  private readonly router = inject(Router);
  readonly id = input<string>();
  protected readonly editando = computed(() => this.id() !== undefined);
  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.editando()) void this.store.cargarLugar(Number(this.id()));
  }
  async onGuardar(datos: DatosLugar): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const actual = this.store.lugarActual();
      if (this.editando() && !actual) return;
      const result = this.editando() && actual
        ? await this.store.modificarLugar(actual.id, datos)
        : await this.store.crearLugar(datos);
      if (result) await this.router.navigate(['/lugares', result.id]);
    } catch (error) { this.store.errorAccion.set((error as Error).message); }
  }
  onCancelar(): void { void this.router.navigate(['/lugares']); }
  reintentar(): void { if (this.editando()) void this.store.cargarLugar(Number(this.id())); }
}
