import { Component, inject, signal } from '@angular/core';
import { LoginForm } from '../shared/components/login-form/login-form';
import { LoginCredentials } from './auth.models';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { safeReturnUrl } from './auth.utils';

@Component({
  selector: 'app-login-page',
  imports: [LoginForm],
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
        <app-login-form [busy]="busy()" [error]="error()" (credentialsSubmit)="submit($event)" />
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

  async submit(credentials: LoginCredentials): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.auth.login(credentials);
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
