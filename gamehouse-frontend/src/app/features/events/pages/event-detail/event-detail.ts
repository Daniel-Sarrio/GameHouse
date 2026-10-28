import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { CelebracionesStore } from '../../../../core/stores/events.store';
import { precioTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.css',
})
export class EventDetail implements OnInit {
  protected readonly store = inject(CelebracionesStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  protected readonly confirmandoBorrado = signal(false);
  ngOnInit(): void { this.store.limpiarErrorAccion(); void this.store.cargarCelebracion(Number(this.id())); }
  precio(value: number): string { return precioTexto(value); }
  fecha(value: string | null): string { return value ? new Date(value).toLocaleString('es-ES', { dateStyle:'long', timeStyle:'short' }) : 'Sin programar'; }
  async eliminar(): Promise<void> {
    const event = this.store.celebracionActual();
    if (!event || this.store.guardando()) return;
    const borrado = await this.store.eliminarCelebracion(event.id);
    if (borrado) await this.router.navigate(['/eventos']);
    else this.confirmandoBorrado.set(false);
  }
  async cambiarEstado(): Promise<void> {
    const event = this.store.celebracionActual();
    if (!event || this.store.guardando()) return;
    await this.store.cambiarEstado(event.id, !event.isActive);
  }
  reintentar(): void { void this.store.cargarCelebracion(Number(this.id())); }
}
