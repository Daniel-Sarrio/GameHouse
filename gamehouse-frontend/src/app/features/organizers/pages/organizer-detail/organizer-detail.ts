import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { OrganizadoresStore } from '../../../../core/stores/hosts.store';
import { estadoTexto } from '../../../../core/utils/experience.utils';

@Component({
  selector: 'app-organizer-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './organizer-detail.html',
  styleUrl: './organizer-detail.css',
})
export class OrganizerDetail implements OnInit {
  protected store = inject(OrganizadoresStore);
  private readonly router = inject(Router);
  slug = input.required<string>();
  protected confirmandoBorrado = signal(false);
  protected vista = computed(() => {
    const organizador = this.store.organizadorActual();
    return organizador ? { organizador, estado: estadoTexto(organizador.status) } : null;
  });

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarOrganizador(this.slug());
  }
  async cambiarEstado(): Promise<void> {
    const organizador = this.store.organizadorActual();
    if (organizador) await this.store.cambiarEstado(organizador.id, !organizador.isActive);
  }
  async eliminar(): Promise<void> {
    const organizador = this.store.organizadorActual();
    if (!organizador) return;
    const borrado = await this.store.eliminarOrganizador(organizador.id);
    if (borrado) await this.router.navigate(['/organizadores']);
    else this.confirmandoBorrado.set(false);
  }
  reintentar(): void { void this.store.cargarOrganizador(this.slug()); }
}
