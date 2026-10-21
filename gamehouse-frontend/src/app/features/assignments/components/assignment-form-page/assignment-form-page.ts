import { Component, OnInit, computed, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';
import { DatosAsignacion } from '../../../../core/models/assignment.model';
import { AsignacionesStore } from '../../../../core/stores/assignments.store';
import { AssignmentForm } from '../assignment-form/assignment-form';
@Component({
  selector: 'app-assignment-form-page',
  imports: [RouterLink, AssignmentForm, EstadoCarga, MensajeError],
  templateUrl: './assignment-form-page.html',
  styleUrl: './assignment-form-page.css',
})
export class AssignmentFormPage implements OnInit {
  protected readonly store = inject(AsignacionesStore);
  private readonly router = inject(Router);
  readonly experienceId = input<string>();
  readonly categoryId = input<string>();
  protected readonly editando = computed(() => this.experienceId() !== undefined);
  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    if (this.editando()) void this.store.cargarAsignacion(Number(this.experienceId()), Number(this.categoryId()));
  }
  async onGuardar(datos: DatosAsignacion): Promise<void> {
    if (this.store.guardando()) return;
    try {
      const actual = this.store.asignacionActual();
      if (this.editando() && !actual) return;
      const result = this.editando() && actual
        ? await this.store.modificarAsignacion(actual.experienceId, actual.categoryId, datos)
        : await this.store.crearAsignacion(datos);
      if (result) await this.router.navigate(['/asignaciones', result.experienceId, result.categoryId]);
    } catch (error) { this.store.errorAccion.set((error as Error).message); }
  }
  onCancelar(): void { void this.router.navigate(['/asignaciones']); }
  reintentar(): void { if (this.editando()) void this.store.cargarAsignacion(Number(this.experienceId()), Number(this.categoryId())); }
}
