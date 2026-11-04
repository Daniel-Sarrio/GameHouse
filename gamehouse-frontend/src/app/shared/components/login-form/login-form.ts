import { Component, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginCredentials } from '../../../auth/auth.models';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  template: `
        <form [formGroup]="form" (ngSubmit)="submit()" class="grid gap-6">
          <label class="grid gap-3 text-base font-semibold"
            >Correo electrónico
            <input
              class="min-w-0 rounded-xl border border-slate-300 px-4 py-4 text-base"
              formControlName="email"
              type="email"
              autocomplete="username"
              placeholder="nombre@ejemplo.com"
            />
          </label>
          <label class="grid gap-3 text-base font-semibold"
            >Contraseña
            <input
              class="min-w-0 rounded-xl border border-slate-300 px-4 py-4 text-base"
              formControlName="password"
              type="password"
              autocomplete="current-password"
            />
          </label>
          @if (form.invalid && form.touched) {
            <p class="text-sm text-red-700" role="alert">
              Introduce un correo válido y tu contraseña.
            </p>
          }
          @if (error()) {
            <p class="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{{ error() }}</p>
          }
          <button class="boton boton-primario mt-2 min-h-14 text-base" [disabled]="busy()">
            {{ busy() ? 'Iniciando sesión…' : 'Entrar' }}
          </button>
        </form>
  `,
})
export class LoginForm {
  readonly busy = input(false);
  readonly error = input('');
  readonly credentialsSubmit = output<LoginCredentials>();
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });
  submit(): void {
    if (this.busy()) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const data = this.form.getRawValue();
    this.credentialsSubmit.emit({ email: data.email.trim(), password: data.password });
  }
}
