import { Component, OnInit, input, output, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Asignacion, DatosAsignacion } from '../../../../core/models/assignment.model';
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
  readonly asignacion = input<Asignacion | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosAsignacion>();
  readonly cancelar = output<void>();
  readonly reintentarOpciones = output<void>();
  readonly experiencias = input<{ id: number; name: string }[]>([]);
  readonly categorias = input<{ id: number; name: string }[]>([]);
  readonly cargando = input(false);
  readonly errorOpciones = input<string | null>(null);
  readonly form = this.fb.group({
    experienceId: this.fb.control(0, [Validators.required, Validators.min(1)]),
    categoryId: this.fb.control(0, [Validators.required, Validators.min(1)]),
  });

  ngOnInit(): void {
    const asignacion = this.asignacion();
    if (asignacion) this.form.setValue({ experienceId: asignacion.experienceId, categoryId: asignacion.categoryId });
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
