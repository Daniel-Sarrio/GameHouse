import { Component, OnInit, inject, input, output } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Celebracion, DatosCelebracion, OpcionesCelebracion } from '../../../../core/models/event.model';
import { EstadoCarga } from '../../../../shared/components/loader/estado-carga';
import { MensajeError } from '../../../../shared/components/error-state/mensaje-error';

const validUrl = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};
const fechaLocal = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
@Component({
  selector: 'app-event-form',
  imports: [ReactiveFormsModule, EstadoCarga, MensajeError],
  templateUrl: './event-form.html',
  styleUrl: './event-form.css',
})
export class EventForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly celebracion = input<Celebracion | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosCelebracion>();
  readonly cancelar = output<void>();
  readonly reintentarOpciones = output<void>();
  readonly opciones = input<OpcionesCelebracion>({ experiences: [], locations: [], categories: [] });
  readonly cargando = input(false);
  readonly errorOpciones = input<string | null>(null);
  readonly form = this.fb.group({
    experienceId: this.fb.control(0, [Validators.min(1)]),
    locationId: this.fb.control(0, [Validators.min(1)]),
    categoryId: this.fb.control(0, [Validators.min(1)]),
    startDatetime: this.fb.control(''),
    endDatetime: this.fb.control(''),
    price: this.fb.control(0, [Validators.min(0)]),
    capacity: this.fb.control(1, [Validators.min(1)]),
    status: this.fb.control<Celebracion['status']>('scheduled'),
    isActive: this.fb.control(true),
    imageUrl: this.fb.control('', [validUrl]),
  });
  categoriasDisponibles(): OpcionesCelebracion['categories'] {
    return this.opciones().categories.filter((item) => item.experienceId === Number(this.form.controls.experienceId.value));
  }
  ngOnInit(): void {
    const event = this.celebracion();
    if (event) this.form.setValue({
      experienceId: event.experienceId, locationId: event.locationId, categoryId: event.categoryId,
      startDatetime: fechaLocal(event.startDatetime),
      endDatetime: fechaLocal(event.endDatetime),
      price: event.price, capacity: event.capacity, status: event.status, isActive: event.isActive, imageUrl: event.imageUrl ?? '',
    });
  }
  cambiarExperiencia(): void { this.form.controls.categoryId.setValue(0); }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('url')) return 'Introduce una URL http o https válida.';
    return 'Selecciona o escribe un valor válido.';
  }
  onSubmit(): void {
    if (this.guardando() || this.cargando() || this.errorOpciones()) return;
    const value = this.form.getRawValue();
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardar.emit({ ...value, startDatetime: value.startDatetime || null,
      endDatetime: value.endDatetime || null, imageUrl: value.imageUrl.trim() || null });
  }
}
