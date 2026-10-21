import { Component, OnInit, input, output, inject } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Categoria, DatosCategoria } from '../../../../core/models/category.model';

const validUrl = (control: AbstractControl): ValidationErrors | null => {
  if (!control.value) return null;
  try { return ['http:', 'https:'].includes(new URL(control.value).protocol) ? null : { url: true }; }
  catch { return { url: true }; }
};

@Component({
  selector: 'app-category-form',
  imports: [ReactiveFormsModule],
  templateUrl: './category-form.html',
  styleUrl: './category-form.css',
})
export class CategoryForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly categoria = input<Categoria | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosCategoria>();
  readonly cancelar = output<void>();
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]),
    description: this.fb.control('', [Validators.maxLength(2000)]),
    imageUrl: this.fb.control('', [validUrl]),
    status: this.fb.control<Categoria['status']>('published', [Validators.required]),
    isActive: this.fb.control(true),
  });

  ngOnInit(): void {
    const category = this.categoria();
    if (category) this.form.setValue({
      name: category.name, description: category.description ?? '',
      imageUrl: category.imageUrl ?? '', status: category.status, isActive: category.isActive,
    });
  }
  error(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('required')) return 'Este campo es obligatorio.';
    if (control.hasError('minlength')) return 'El nombre es demasiado corto.';
    if (control.hasError('maxlength')) return 'El texto es demasiado largo.';
    if (control.hasError('url')) return 'Introduce una URL http o https válida.';
    return 'Revisa este campo.';
  }
  onSubmit(): void {
    if (this.form.invalid || !this.form.controls.name.value.trim()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.guardar.emit({ ...value, name: value.name.trim(),
      description: value.description.trim() || null,
      imageUrl: value.imageUrl.trim() || null });
  }
}
