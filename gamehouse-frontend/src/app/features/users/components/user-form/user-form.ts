import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthRole } from '../../../../auth/auth.models';
import { User, UserPayload } from '../../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-4">
      <div class="grid gap-4 sm:grid-cols-2">
        <label class="grid gap-2 text-sm font-semibold"
          >Nombre<input
            class="rounded-lg border border-slate-300 p-3"
            formControlName="name"
            maxlength="100"
            autocomplete="name"
        /></label>
        <label class="grid gap-2 text-sm font-semibold"
          >Correo<input
            class="rounded-lg border border-slate-300 p-3"
            formControlName="email"
            type="email"
            autocomplete="email"
        /></label>
        <label class="grid gap-2 text-sm font-semibold"
          >{{ value() ? 'Nueva contraseña (opcional)' : 'Contraseña'
          }}<input
            class="rounded-lg border border-slate-300 p-3"
            formControlName="password"
            type="password"
            autocomplete="new-password"
          /><small class="font-normal text-slate-500">Entre 12 y 128 caracteres.</small></label
        >
        <label class="grid gap-2 text-sm font-semibold"
          >Rol<select class="rounded-lg border border-slate-300 p-3" formControlName="role">
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select></label
        >
        <label class="grid gap-2 text-sm font-semibold"
          >Etiqueta de estado<input
            class="rounded-lg border border-slate-300 p-3"
            formControlName="status"
            maxlength="30"
          /><small class="font-normal text-slate-500"
            >La activación se gestiona desde la tabla.</small
          ></label
        >
        <label class="grid gap-2 text-sm font-semibold"
          >URL del avatar (opcional)<input
            class="rounded-lg border border-slate-300 p-3"
            formControlName="avatarImageUrl"
            type="url"
            placeholder="https://…"
        /></label>
      </div>
      @if (form.invalid && form.touched) {
        <p class="text-sm text-red-700" role="alert">
          Revisa el nombre, correo, contraseña, estado y la URL del avatar (http o https).
        </p>
      }
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="boton boton-secundario"
          [disabled]="busy()"
          (click)="cancel.emit()"
        >
          Cancelar</button
        ><button class="boton boton-primario" [disabled]="busy()">
          {{ busy() ? 'Guardando…' : 'Guardar usuario' }}
        </button>
      </div>
    </form>
  `,
})
export class UserForm {
  readonly value = input<User | null>(null);
  readonly busy = input(false);
  readonly save = output<UserPayload>();
  readonly cancel = output<void>();
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100), Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: [''],
    role: ['USER' as AuthRole, Validators.required],
    status: ['active', [Validators.required, Validators.maxLength(30), Validators.pattern(/\S/)]],
    avatarImageUrl: ['', [Validators.maxLength(2048), Validators.pattern(/^https?:\/\/[^\s]+$/)]],
  });
  constructor() {
    effect(() => {
      const user = this.value();
      this.form.reset({
        name: user?.name || '',
        email: user?.email || '',
        password: '',
        role: user?.role || 'USER',
        status: user?.status || 'active',
        avatarImageUrl: user?.avatarUrl || '',
      });
      this.form.controls.password.setValidators([
        Validators.minLength(12),
        Validators.maxLength(128),
        ...(!user ? [Validators.required] : []),
      ]);
      this.form.controls.password.updateValueAndValidity();
    });
  }
  submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.save.emit({
      name: raw.name.trim(),
      email: raw.email.trim().toLowerCase(),
      role: raw.role,
      status: raw.status.trim(),
      avatarImageUrl: raw.avatarImageUrl.trim() || null,
      ...(raw.password ? { password: raw.password } : {}),
    });
  }
}
