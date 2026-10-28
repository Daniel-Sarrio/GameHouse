import { Component, OnInit, input, output, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Rol, DatosRol, NOMBRES_ROL } from '../../../../core/models/role.model';

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
  readonly nombresRol = NOMBRES_ROL;
  readonly form = this.fb.group({
    name: this.fb.control<Rol['name'] | ''>('', [Validators.required, Validators.pattern(/^(USER|ADMIN|HOST)$/)]),
  });

  ngOnInit(): void {
    const rol = this.rol();
    if (rol) this.form.setValue({ name: rol.name });
  }
  error(): string | null {
    const control = this.form.controls.name;
    if (!control.invalid || !(control.dirty || control.touched)) return null;
    return 'Selecciona USER, ADMIN o HOST.';
  }
  onSubmit(): void {
    if (this.guardando()) return;
    const name = this.form.controls.name.value;
    if (this.form.invalid || !name) { this.form.markAllAsTouched(); return; }
    this.guardar.emit({ name });
  }
}
