import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { RolesStore } from '../../../../core/stores/roles.store';

@Component({
  selector: 'app-role-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './role-detail.html',
  styleUrl: './role-detail.css',
})
export class RoleDetail implements OnInit {
  protected readonly store = inject(RolesStore);
  private readonly router = inject(Router);
  readonly id = input.required<string>();
  protected readonly confirmandoBorrado = signal(false);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarRol(Number(this.id()));
  }
  async eliminar(): Promise<void> {
    const rol = this.store.rolActual();
    if (!rol || this.store.guardando()) return;
    const borrado = await this.store.eliminarRol(rol.id);
    if (borrado) await this.router.navigate(['/roles']);
    else this.confirmandoBorrado.set(false);
  }
  reintentar(): void { void this.store.cargarRol(Number(this.id())); }
}
