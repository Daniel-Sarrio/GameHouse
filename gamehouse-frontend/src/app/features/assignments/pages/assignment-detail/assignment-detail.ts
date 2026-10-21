import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { AsignacionesStore } from '../../../../core/stores/assignments.store';
@Component({
  selector: 'app-assignment-detail',
  imports: [RouterLink, EstadoCarga, MensajeError],
  templateUrl: './assignment-detail.html',
  styleUrl: './assignment-detail.css',
})
export class AssignmentDetail implements OnInit {
  protected readonly store = inject(AsignacionesStore);
  private readonly router = inject(Router);
  readonly experienceId = input.required<string>();
  readonly categoryId = input.required<string>();
  protected readonly confirmandoBorrado = signal(false);
  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.store.cargarAsignacion(Number(this.experienceId()), Number(this.categoryId()));
  }
  async eliminar(): Promise<void> {
    const actual = this.store.asignacionActual();
    if (!actual || this.store.guardando()) return;
    const borrado = await this.store.eliminarAsignacion(actual.experienceId, actual.categoryId);
    if (borrado) await this.router.navigate(['/asignaciones']);
    else this.confirmandoBorrado.set(false);
  }
  reintentar(): void { void this.store.cargarAsignacion(Number(this.experienceId()), Number(this.categoryId())); }
}
