import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { EventosStore } from '../../../../core/stores/experiences.store';
import { estadoTexto, precioTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-evento-detalle-page',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './evento-detalle-page.html',
  styleUrl: './evento-detalle-page.css',
})
export class EventoDetallePage implements OnInit {
  protected store = inject(EventosStore);
  private readonly router = inject(Router);
  slug = input.required<string>();
  protected confirmandoBorrado = signal(false);
  protected vista = computed(() => {
    const evento = this.store.eventoActual();
    return evento ? { evento, precio: precioTexto(evento.price, evento.currency), estado: estadoTexto(evento.status) } : null;
  });

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarEvento(this.slug());
  }

  async cambiarEstado(): Promise<void> {
    const evento = this.store.eventoActual();
    if (evento) await this.store.cambiarEstado(evento.id, !evento.isActive);
  }

  async eliminar(): Promise<void> {
    const evento = this.store.eventoActual();
    if (!evento) return;
    const borrado = await this.store.eliminarEvento(evento.id);
    if (borrado) await this.router.navigate(['/']);
    else this.confirmandoBorrado.set(false);
  }

  reintentar(): void { void this.store.cargarEvento(this.slug()); }
}
