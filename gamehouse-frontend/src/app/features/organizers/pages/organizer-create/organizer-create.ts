import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { DatosOrganizador } from '../../../../core/models/host.model';
import { OrganizadoresStore } from '../../../../core/stores/hosts.store';
import { OrganizerFormPage } from '../../components/organizer-form-page/organizer-form-page';

@Component({
  selector: 'app-organizer-create',
  imports: [OrganizerFormPage],
  template: `
    <app-organizer-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class OrganizerCreate implements OnInit {
  protected readonly store = inject(OrganizadoresStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
  }

  async onGuardar(datos: DatosOrganizador): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const resultado = await this.store.crearOrganizador(datos);
      if (resultado) await this.router.navigate(['/organizadores', resultado.slug]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/organizadores']);
  }
}
