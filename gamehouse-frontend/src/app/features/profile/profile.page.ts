import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../auth/auth.service';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-profile-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto max-w-3xl p-6 sm:p-10">
      <p class="text-xs font-bold uppercase tracking-widest text-indigo-600">Mi cuenta</p>
      <h1 class="mt-2 text-3xl font-bold">Mi perfil</h1>
      <p class="mb-8 mt-2 text-slate-500">Actualiza tus datos personales.</p>
      <div class="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <strong>{{ auth.user()?.email }}</strong
        ><span class="ml-3 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{{
          auth.user()?.role
        }}</span>
      </div>
      @if (loading()) {
        <p role="status">Cargando perfil…</p>
      }
      @if (error()) {
        <div role="alert" class="mb-4 rounded-xl bg-red-50 p-4 text-red-700">
          {{ error() }}
          @if (!loaded()) {
            <button class="boton boton-secundario" (click)="load()">Reintentar</button>
          }
        </div>
      }
      @if (loaded()) {
        <form
          [formGroup]="form"
          (ngSubmit)="save()"
          class="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6"
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="grid gap-2 text-sm font-semibold"
              >Nombre<input
                class="rounded-xl border border-slate-300 p-3"
                formControlName="firstName"
                autocomplete="given-name"
                maxlength="100"
            /></label>
            <label class="grid gap-2 text-sm font-semibold"
              >Apellidos<input
                class="rounded-xl border border-slate-300 p-3"
                formControlName="lastName"
                autocomplete="family-name"
                maxlength="100"
            /></label>
            <label class="grid gap-2 text-sm font-semibold"
              >Teléfono<input
                class="rounded-xl border border-slate-300 p-3"
                formControlName="phone"
                type="tel"
                autocomplete="tel"
                maxlength="30"
            /></label>
            <label class="grid gap-2 text-sm font-semibold"
              >URL del avatar<input
                class="rounded-xl border border-slate-300 p-3"
                formControlName="avatarUrl"
                type="url"
                placeholder="https://…"
            /></label>
          </div>
          @if (form.invalid && form.touched) {
            <p class="text-sm text-red-700" role="alert">
              Revisa los campos. La URL debe comenzar por http:// o https://.
            </p>
          }
          @if (saved()) {
            <p class="text-sm text-emerald-700" role="status">Perfil actualizado.</p>
          }
          <button class="boton boton-primario justify-self-end" [disabled]="busy()">
            {{ busy() ? 'Guardando…' : 'Guardar cambios' }}
          </button>
        </form>
      }
    </section>
  `,
})
export class ProfilePage {
  readonly auth = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly service = inject(ProfileService);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly busy = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', Validators.maxLength(100)],
    lastName: ['', Validators.maxLength(100)],
    phone: ['', Validators.maxLength(30)],
    avatarUrl: ['', [Validators.maxLength(2048), Validators.pattern(/^https?:\/\/[^\s]+$/)]],
  });
  constructor() {
    void this.load();
  }
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const profile = await this.service.getMe();
      this.form.reset({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.phone || '',
        avatarUrl: profile.avatarUrl || '',
      });
      this.loaded.set(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo cargar el perfil.');
    } finally {
      this.loading.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.saved.set(false);
    this.error.set('');
    try {
      const value = this.form.getRawValue();
      await this.service.updateMe({
        firstName: value.firstName.trim() || null,
        lastName: value.lastName.trim() || null,
        phone: value.phone.trim() || null,
        avatarUrl: value.avatarUrl.trim() || null,
      });
      await this.authService.validateSession();
      this.saved.set(true);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el perfil.');
    } finally {
      this.busy.set(false);
    }
  }
}
