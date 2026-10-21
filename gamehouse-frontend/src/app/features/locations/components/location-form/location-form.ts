import { Component, OnInit, input, output, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Lugar, DatosLugar } from '../../../../core/models/location.model';

const validUrl = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};

@Component({
  selector: 'app-location-form',
  imports: [ReactiveFormsModule],
  templateUrl: './location-form.html',
  styleUrl: './location-form.css',
})
export class LocationForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly lugar = input<Lugar | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosLugar>();
  readonly cancelar = output<void>();
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(150)]),
    address: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255)]),
    city: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]),
    postalCode: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(20)]),
    country: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]),
    imageUrl: this.fb.control('', [validUrl]),
  });

  ngOnInit(): void {
    const lugar = this.lugar();
    if (lugar) this.form.setValue({ name: lugar.name, address: lugar.address ?? '', city: lugar.city,
      postalCode: lugar.postalCode ?? '', country: lugar.country, imageUrl: lugar.imageUrl ?? '' });
  }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('required') || control.hasError('pattern')) return 'Este campo es obligatorio.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('url')) return 'Introduce una URL http o https válida.';
    return 'Revisa este campo.';
  }
  onSubmit(): void {
    if (this.guardando()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    this.guardar.emit({ name: value.name.trim(), address: value.address.trim(), city: value.city.trim(),
      postalCode: value.postalCode.trim(), country: value.country.trim(), imageUrl: value.imageUrl.trim() || null });
  }
}
