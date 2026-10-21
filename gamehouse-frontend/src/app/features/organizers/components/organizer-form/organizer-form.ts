import { Component, OnInit, input, output, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { DatosOrganizador, Organizador } from '../../../../core/models/host.model';

const validUrl = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};

@Component({
  selector: 'app-organizer-form',
  imports: [ReactiveFormsModule],
  templateUrl: './organizer-form.html',
  styleUrl: './organizer-form.css',
})
export class OrganizerForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly organizador = input<Organizador | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosOrganizador>();
  readonly cancelar = output<void>();
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    description: this.fb.control('', [Validators.maxLength(2000)]),
    imageUrl: this.fb.control('', [validUrl]),
    email: this.fb.control('', [Validators.email]),
    phone: this.fb.control('', [Validators.maxLength(30)]),
    status: this.fb.control<Organizador['status']>('published', [Validators.required]),
    isActive: this.fb.control(true),
  });

  ngOnInit(): void {
    const host = this.organizador();
    if (host) this.form.setValue({
      name: host.name, description: host.description ?? '', imageUrl: host.imageUrl ?? '',
      email: host.email ?? '', phone: host.phone ?? '', status: host.status,
      isActive: host.isActive,
    });
  }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return 'El nombre es demasiado corto.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('url')) return 'Introduce una URL http o https válida.';
    if (control.hasError('email')) return 'Introduce un correo válido.';
    return 'Revisa este campo.';
  }
  onSubmit(): void {
    if (this.form.invalid || !this.form.controls.name.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.guardar.emit({ ...value, name: value.name.trim(),
      description: value.description.trim() || null, imageUrl: value.imageUrl.trim() || null,
      email: value.email.trim() || null, phone: value.phone.trim() || null });
  }
}
