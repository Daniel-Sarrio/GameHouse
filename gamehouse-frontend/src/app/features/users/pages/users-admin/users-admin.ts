import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { UsersStore } from '../../../../core/stores/users.store';
import { UsersService } from '../../../../core/services/users.service';
import { User, UserPayload } from '../../../../core/models/user.model';
import { UserForm } from '../../components/user-form/user-form';
import { AuthStore } from '../../../../auth/auth.store';
import { AuthService } from '../../../../auth/auth.service';

@Component({
  selector: 'app-users-admin',
  imports: [UserForm, DatePipe],
  providers: [UsersStore],
  template: `
    <section class="p-6 sm:p-10">
      <header class="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-widest text-indigo-600">Administración</p>
          <h1 class="mt-2 text-3xl font-bold">Usuarios</h1>
          <p class="mt-2 text-sm text-slate-500">
            Gestiona cuentas, permisos y acceso a GameHouse.
          </p>
        </div>
        <button class="boton boton-primario" [disabled]="busy()" (click)="edit(null)">
          + Nuevo usuario
        </button>
      </header>
      @if (formOpen()) {
        <section
          class="mb-6 rounded-2xl border border-indigo-200 bg-white p-6"
          aria-labelledby="user-form-heading"
        >
          <h2 id="user-form-heading" class="mb-5 text-xl font-bold">
            {{ selected() ? 'Editar usuario' : 'Crear usuario' }}
          </h2>
          <app-user-form
            [value]="selected()"
            [busy]="busy()"
            (save)="save($event)"
            (cancel)="formOpen.set(false)"
          />
        </section>
      }
      @if (error()) {
        <p class="mb-4 rounded-xl bg-red-50 p-4 text-red-700" role="alert">{{ error() }}</p>
      }
      @if (message()) {
        <p class="mb-4 rounded-xl bg-emerald-50 p-4 text-emerald-800" role="status">
          {{ message() }}
        </p>
      }
      <div class="mb-5 flex flex-wrap gap-3">
        <label class="flex flex-1 items-center gap-3 text-sm"
          >Buscar en esta página<input
            class="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white p-3"
            placeholder="Nombre o correo"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
        /></label>
        <label class="flex items-center gap-3 text-sm"
          >Estado<select
            class="rounded-xl border border-slate-300 bg-white p-3"
            [value]="filter()"
            (change)="filter.set($any($event.target).value)"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
            <option value="deleted">Eliminados</option>
          </select></label
        >
      </div>
      @if (store.loading()) {
        <p class="rounded-xl bg-white p-8 text-center" role="status">Cargando usuarios…</p>
      } @else if (store.error()) {
        <div role="alert" class="rounded-xl bg-red-50 p-6">
          <p>{{ store.error() }}</p>
          <button class="boton boton-secundario mt-3" (click)="store.load()">Reintentar</button>
        </div>
      } @else {
        <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table class="w-full text-left text-sm">
            <caption class="sr-only">
              Usuarios, rol y estado de acceso
            </caption>
            <thead class="bg-slate-50 text-slate-500">
              <tr>
                <th class="p-4">Usuario</th>
                <th class="p-4">Rol</th>
                <th class="p-4">Acceso</th>
                <th class="p-4">Último acceso</th>
                <th class="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (user of visible(); track user.id) {
                <tr class="border-t border-slate-100">
                  <td class="p-4">
                    <strong class="block">{{ user.name || 'Sin nombre' }}</strong
                    ><span class="text-slate-500">{{ user.email }}</span>
                    @if (user.id === auth.user()?.id) {
                      <span class="ml-2 text-xs text-indigo-600">Tú</span>
                    }
                  </td>
                  <td class="p-4">{{ user.role }}</td>
                  <td class="p-4">
                    <span
                      class="rounded-full px-3 py-1 text-xs font-bold"
                      [class]="
                        user.deletedAt
                          ? 'bg-red-50 text-red-700'
                          : user.isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                      "
                      >{{
                        user.deletedAt ? 'Eliminado' : user.isActive ? 'Activo' : 'Inactivo'
                      }}</span
                    >
                  </td>
                  <td class="p-4 text-slate-500">
                    {{
                      user.lastLoginAt
                        ? (user.lastLoginAt | date: 'dd/MM/yyyy HH:mm')
                        : 'Sin accesos'
                    }}
                  </td>
                  <td class="p-4">
                    @if (!user.deletedAt) {
                      <div class="flex gap-2">
                        <button
                          class="boton boton-secundario"
                          [disabled]="busy() || !user.isActive"
                          (click)="edit(user)"
                        >
                          Editar</button
                        ><button
                          class="boton boton-secundario"
                          [disabled]="busy()"
                          (click)="toggle(user)"
                        >
                          {{ user.isActive ? 'Desactivar' : 'Activar' }}</button
                        ><button
                          class="boton boton-peligro"
                          [disabled]="busy()"
                          (click)="remove(user)"
                        >
                          Eliminar
                        </button>
                      </div>
                    } @else {
                      <span class="text-xs text-slate-500">Datos conservados</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="p-10 text-center text-slate-500">
                    No hay usuarios que coincidan con los filtros de esta página.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <footer class="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500">
        <span
          >Página {{ store.offset() / store.pageSize + 1 }} · {{ store.items().length }} registros
          cargados</span
        >
        <div class="flex gap-2">
          <button
            class="boton boton-secundario"
            [disabled]="!store.offset() || store.loading() || busy()"
            (click)="store.load(store.offset() - store.pageSize)"
          >
            Anterior</button
          ><button
            class="boton boton-secundario"
            [disabled]="store.items().length < store.pageSize || store.loading() || busy()"
            (click)="store.load(store.offset() + store.pageSize)"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  `,
})
export class UsersAdmin {
  readonly store = inject(UsersStore);
  readonly auth = inject(AuthStore);
  private readonly service = inject(UsersService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  readonly selected = signal<User | null>(null);
  readonly formOpen = signal(false);
  readonly busy = signal(false);
  readonly search = signal('');
  readonly filter = signal('all');
  readonly error = signal('');
  readonly message = signal('');
  readonly visible = computed(() =>
    this.store.items().filter((user) => {
      const matches = `${user.name || ''} ${user.email}`
        .toLowerCase()
        .includes(this.search().toLowerCase());
      return (
        matches &&
        (this.filter() === 'all' ||
          (this.filter() === 'deleted'
            ? !!user.deletedAt
            : !user.deletedAt && user.isActive === (this.filter() === 'active')))
      );
    }),
  );
  constructor() {
    void this.store.load();
  }
  edit(user: User | null): void {
    this.selected.set(user);
    this.formOpen.set(true);
    this.error.set('');
    this.message.set('');
  }
  async save(payload: UserPayload): Promise<void> {
    await this.perform(async () => {
      const user = this.selected();
      if (user) {
        this.store.upsert(await this.service.update(user.id, payload));
      } else {
        await this.service.create(payload);
        await this.store.load(0);
      }
      this.formOpen.set(false);
      if (user?.id === this.auth.user()?.id) {
        await this.authService.validateSession();
        if (!this.auth.isAdmin()) await this.router.navigate(['/dashboard']);
      }
    }, 'Usuario guardado.');
  }
  async toggle(user: User): Promise<void> {
    if (
      user.id === this.auth.user()?.id &&
      !window.confirm('Si desactivas tu cuenta se cerrará tu sesión. ¿Continuar?')
    )
      return;
    await this.perform(async () => {
      this.store.upsert(await this.service.setActive(user.id, !user.isActive));
      if (user.id === this.auth.user()?.id) await this.authService.logout();
    }, 'Acceso actualizado.');
  }
  async remove(user: User): Promise<void> {
    if (
      !window.confirm(
        `¿Eliminar a ${user.email}? Se desactivará su acceso y se conservarán sus datos.`,
      )
    )
      return;
    await this.perform(async () => {
      this.store.upsert(await this.service.softDelete(user.id));
      if (user.id === this.auth.user()?.id) await this.authService.logout();
    }, 'Usuario eliminado. Sus datos se conservan.');
  }
  private async perform(action: () => Promise<void>, message: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await action();
      this.message.set(message);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo completar la operación.');
    } finally {
      this.busy.set(false);
    }
  }
}
