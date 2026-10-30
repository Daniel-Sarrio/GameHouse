import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { safeReturnUrl } from './auth.utils';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <main class="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-8 sm:p-8">
      <section
        class="w-full max-w-xl rounded-3xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:p-12"
        aria-labelledby="login-title"
      >
        <p class="mb-6 text-center text-sm font-bold tracking-widest text-indigo-600">GAMEHOUSE</p>
        <h1 id="login-title" class="text-center text-3xl font-bold text-slate-900 sm:text-4xl">Iniciar sesión</h1>
        <p class="mb-10 mt-3 text-center text-base text-slate-500">Accede a tu espacio.</p>
        @if (route.snapshot.queryParamMap.get('reason') === 'session') {
          <p class="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="status">
            Tu sesión ha terminado. Vuelve a iniciar sesión.
          </p>
        }
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
      </section>
    </main>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.maxLength(128)]],
  });

  async submit(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const data = this.form.getRawValue();
      await this.auth.login({ email: data.email.trim(), password: data.password });
      if (!this.store.isAuthenticated()) return;
      await this.router.navigateByUrl(
        safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), '/dashboard'),
      );
    } catch (error: any) {
      this.error.set(
        error.status === 401
          ? 'Correo o contraseña incorrectos.'
          : error.status === 429
            ? 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.'
            : 'No se ha podido iniciar sesión. Comprueba la conexión e inténtalo de nuevo.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
