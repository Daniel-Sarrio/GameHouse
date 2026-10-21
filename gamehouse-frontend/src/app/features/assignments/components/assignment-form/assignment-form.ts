import { Component, OnInit, input, output, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Asignacion, DatosAsignacion } from '../../../../core/models/assignment.model';
import { EventosService } from '../../../../core/services/experience.service';
import { CategoriasService } from '../../../../core/services/category.service';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';

@Component({
  selector: 'app-assignment-form',
  imports: [ReactiveFormsModule, EstadoCarga, MensajeError],
  templateUrl: './assignment-form.html',
  styleUrl: './assignment-form.css',
})
export class AssignmentForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly eventosService = inject(EventosService);
  private readonly categoriasService = inject(CategoriasService);
  readonly asignacion = input<Asignacion | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosAsignacion>();
  readonly cancelar = output<void>();
  readonly experiencias = signal<{ id: number; name: string }[]>([]);
  readonly categorias = signal<{ id: number; name: string }[]>([]);
  readonly cargando = signal(false);
  readonly errorOpciones = signal<string | null>(null);
  readonly form = this.fb.group({
    experienceId: this.fb.control(0, [Validators.required, Validators.min(1)]),
    categoryId: this.fb.control(0, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    const asignacion = this.asignacion();
    if (asignacion) this.form.setValue({ experienceId: asignacion.experienceId, categoryId: asignacion.categoryId });
    void this.cargarOpciones();
  }
  async cargarOpciones(): Promise<void> {
    this.cargando.set(true);
    this.errorOpciones.set(null);
    try {
      const [experiencias, categorias] = await Promise.all([
        this.eventosService.obtenerEventos(), this.categoriasService.obtenerCategorias(),
      ]);
      this.experiencias.set(experiencias);
      this.categorias.set(categorias);
    } catch (error) { this.errorOpciones.set((error as Error).message); }
    finally { this.cargando.set(false); }
  }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    return control.invalid && (control.dirty || control.touched) ? 'Selecciona una opción.' : null;
  }
  onSubmit(): void {
    if (this.guardando() || this.cargando() || this.errorOpciones()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardar.emit(this.form.getRawValue());
  }
}
