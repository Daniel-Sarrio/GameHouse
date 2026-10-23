import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatosAsignacion, OpcionesAsignacion } from '../../../../core/models/assignment.model';
import { AsignacionesStore } from '../../../../core/stores/assignments.store';
import { EventosService } from '../../../../core/services/experience.service';
import { CategoriasService } from '../../../../core/services/category.service';
import { AssignmentFormPage } from '../../components/assignment-form-page/assignment-form-page';

@Component({
  selector: 'app-assignment-create',
  imports: [AssignmentFormPage],
  template: `
    <app-assignment-form-page
      [guardando]="store.guardando()"
      [errorServidor]="store.errorAccion()"
      [opciones]="opciones()"
      [cargandoOpciones]="cargandoOpciones()"
      [errorOpciones]="errorOpciones()"
      (reintentarOpciones)="cargarOpciones()"
      (guardar)="onGuardar($event)"
      (cancelar)="onCancelar()"
    />
  `,
})
export class AssignmentCreate implements OnInit {
  protected readonly store = inject(AsignacionesStore);
  private readonly router = inject(Router);
  private readonly experienciasService = inject(EventosService);
  private readonly categoriasService = inject(CategoriasService);
  readonly opciones = signal<OpcionesAsignacion>({ experiencias: [], categorias: [] });
  readonly cargandoOpciones = signal(false);
  readonly errorOpciones = signal<string | null>(null);

  ngOnInit(): void {
    this.store.limpiarErrorAccion();
    void this.cargarOpciones();
  }

  async cargarOpciones(): Promise<void> {
    this.cargandoOpciones.set(true);
    this.errorOpciones.set(null);
    try {
      const [experiencias, categorias] = await Promise.all([
        this.experienciasService.obtenerEventos(), this.categoriasService.obtenerCategorias(),
      ]);
      this.opciones.set({ experiencias, categorias });
    } catch (error) {
      this.errorOpciones.set(error instanceof Error ? error.message : 'No se pudieron cargar las opciones.');
    } finally {
      this.cargandoOpciones.set(false);
    }
  }

  async onGuardar(datos: DatosAsignacion): Promise<void> {
    if (this.store.guardando() || this.cargandoOpciones() || this.errorOpciones()) return;
    try {
      const resultado = await this.store.crearAsignacion(datos);
      if (resultado) await this.router.navigate(['/asignaciones', resultado.experienceId, resultado.categoryId]);
    } catch (error) {
      this.store.errorAccion.set(error instanceof Error ? error.message : 'No se pudieron guardar los cambios.');
    }
  }

  onCancelar(): void {
    void this.router.navigate(['/asignaciones']);
  }
}
