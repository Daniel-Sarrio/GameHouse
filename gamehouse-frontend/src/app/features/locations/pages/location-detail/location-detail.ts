import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { LugaresStore } from '../../../../core/stores/locations.store';
@Component({
  selector: 'app-location-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './location-detail.html',
  styleUrl: './location-detail.css',
})
export class LocationDetail implements OnInit {
  protected readonly store = inject(LugaresStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  protected readonly confirmandoBorrado = signal(false);
  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarLugar(Number(this.id()));
  }
  async eliminar(): Promise<void> {
    const actual = this.store.lugarActual();
    if (!actual || this.store.guardando()) return;
    const borrado = await this.store.eliminarLugar(actual.id);
    if (borrado) await this.router.navigate(['/lugares']);
    else this.confirmandoBorrado.set(false);
  }
  reintentar(): void { void this.store.cargarLugar(Number(this.id())); }
}
