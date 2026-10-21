import { Component, OnInit, input, output, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol, DatosRol } from '../../../../core/models/role.model';

@Component({
  selector: 'app-role-form',
  imports: [ReactiveFormsModule],
  templateUrl: './role-form.html',
  styleUrl: './role-form.css',
})
export class RoleForm implements OnInit {
  private readonly fb = inject(NonNullableFormBuilder);
  readonly rol = input<Rol | null>(null);
  readonly guardando = input(false);
  readonly errorServidor = input<string | null>(null);
  readonly guardar = output<DatosRol>();
  readonly cancelar = output<void>();
  readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.pattern(/\S/), Validators.maxLength(50)]),
  });

  ngOnInit(): void {
    const rol = this.rol();
    if (rol) this.form.setValue({ name: rol.name });
  }
  error(): string | null {
    const control = this.form.controls.name;
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    if (control.hasError('maxlength')) return 'El nombre es demasiado largo.';
    return 'El nombre es obligatorio.';
  }
  onSubmit(): void {
    if (this.guardando()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardar.emit({ name: this.form.controls.name.value.trim() });
  }
}
