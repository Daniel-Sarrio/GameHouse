import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { AbstractControl, ReactiveFormsModule, ValidationErrors, Validators, NonNullableFormBuilder } from '@angular/forms';
import { DatosEvento, Evento } from '../../../../core/models/experience.model';
import { EventosService, OpcionesEvento } from '../../../../core/services/experience.service';

const validUrl = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};
@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule],
  templateUrl: './evento-form.html',
  styleUrl: './evento-form.css',
})
export class EventoForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly eventosService = inject(EventosService);
  readonly opciones = signal<OpcionesEvento>({ hosts: [], categories: [] });
  readonly errorOpciones = signal<string | null>(null);
  readonly evento = input<Evento | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosEvento>();
  readonly cancelar = output<void>();
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(180)]),
    description: this.fb.control('', [Validators.maxLength(2000)]),
    imageUrl: this.fb.control('', [validUrl]),
    hostId: this.fb.control(0, [Validators.min(1)]),
    categoryIds: this.fb.control<number[]>([], [Validators.required, Validators.minLength(1)]),
    status: this.fb.control<Evento['status']>('published', [Validators.required]),
    isActive: this.fb.control(true),
  });
  ngOnInit(): void {
    void this.cargarOpciones();
    const evento = this.evento();
    if (evento) this.form.setValue({ name: evento.name, description: evento.description ?? '',
      imageUrl: evento.imageUrl ?? '', hostId: evento.hostId, categoryIds: evento.categoryIds,
      status: evento.status, isActive: evento.isActive });
  }
  async cargarOpciones(): Promise<void> {
    try { this.opciones.set(await this.eventosService.obtenerOpcionesFormulario()); this.errorOpciones.set(null); }
    catch { this.errorOpciones.set('No se pudieron cargar organizadores y categorías.'); }
  }
  cambiarCategoria(id: number, checked: boolean): void {
    const ids = this.form.controls.categoryIds.value;
    this.form.controls.categoryIds.setValue(checked ? [...ids, id] : ids.filter((value) => value !== id));
    this.form.controls.categoryIds.markAsTouched();
  }
  categoriaSeleccionada(id: number): boolean { return this.form.controls.categoryIds.value.includes(id); }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('required') || control.hasError('pattern')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('url')) return 'Introduce una URL http o https válida.';
    return 'Selecciona una opción válida.';
  }
  onSubmit(): void {
    if (this.guardando() || this.errorOpciones()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.guardar.emit({ ...value, name: value.name.trim(), description: value.description.trim() || null,
      imageUrl: value.imageUrl.trim() || null });
  }
}
