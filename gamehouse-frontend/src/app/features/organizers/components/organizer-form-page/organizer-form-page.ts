import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosOrganizador } from '../../../../core/models/host.model';
import { OrganizadoresStore } from '../../../../core/stores/hosts.store';
import { OrganizerForm } from '../organizer-form/organizer-form';

@Component({
  selector: 'app-organizer-form-page',
  imports: [RouterLink, OrganizerForm, EstadoCarga, MensajeError],
  templateUrl: './organizer-form-page.html',
  styleUrl: './organizer-form-page.css',
})
export class OrganizerFormPage implements OnInit {
  protected readonly store = inject(OrganizadoresStore);
  private readonly router = inject(Router);
  readonly slug = input<string>();
  protected readonly editando = computed(() => !!this.slug());

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.slug()) void this.store.cargarOrganizador(this.slug()!);
  }
  async onGuardar(datos: DatosOrganizador): Promise<void> {
    const host = this.store.organizadorActual();
    const result = this.slug() && host
      ? await this.store.modificarOrganizador(host.id, datos)
      : await this.store.crearOrganizador(datos);
    if (result) await this.router.navigate(['/organizadores', result.slug]);
  }
  onCancelar(): void {
    void this.router.navigate(this.slug() ? ['/organizadores', this.slug()] : ['/organizadores']);
  }
  reintentar(): void { if (this.slug()) void this.store.cargarOrganizador(this.slug()!); }
}
