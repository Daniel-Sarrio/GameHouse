import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  template: `
    <section class="p-6 sm:p-10">
      <p class="text-xs font-bold uppercase tracking-widest text-indigo-600">
        Tu espacio de trabajo
      </p>
      <h1 class="mt-3 text-3xl font-bold sm:text-4xl">
        Hola, {{ auth.user()?.name || 'bienvenido' }}
      </h1>
      <p class="mt-3 text-slate-500">
        {{
          auth.isAdmin()
            ? 'Todo listo para gestionar tu comunidad y tus experiencias.'
            : 'Consulta tu cuenta y mantén tus datos al día.'
        }}
      </p>
      @if (auth.isAdmin()) {
        <div
          class="my-8 flex flex-wrap items-center justify-between gap-6 rounded-2xl bg-indigo-600 p-7 text-white"
        >
          <div>
            <p class="text-xs font-bold uppercase tracking-widest text-indigo-200">
              Control de acceso
            </p>
            <h2 class="mt-2 text-2xl font-bold">Una comunidad bien organizada</h2>
            <p class="mt-2 text-sm text-indigo-100">
              Crea cuentas, asigna roles y gestiona el acceso de tus usuarios.
            </p>
          </div>
          <a routerLink="/usuarios" class="boton bg-white text-indigo-700">Gestionar usuarios →</a>
        </div>
        <h2 class="mb-4 text-lg font-bold">Accesos de administración</h2>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (item of sections; track item.path) {
            <a
              [routerLink]="item.path"
              class="group rounded-2xl border border-slate-200 bg-white p-6 no-underline transition hover:border-indigo-300 hover:shadow-sm"
              ><span
                class="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600"
                aria-hidden="true"
                >{{ item.symbol }}</span
              >
              <h3 class="font-bold text-slate-900">
                {{ item.title }} <span class="float-right text-indigo-500">↗</span>
              </h3>
              <p class="mt-2 text-sm leading-6 text-slate-500">{{ item.description }}</p></a
            >
          }
        </div>
      } @else {
        <section class="mt-8 rounded-2xl border border-slate-200 bg-white p-8">
          <h2 class="text-xl font-bold">Tu perfil, siempre actualizado</h2>
          <p class="my-4 text-slate-500">
            Gestiona tu nombre, teléfono y avatar desde tu área personal.
          </p>
          <a class="boton boton-primario" routerLink="/perfil">Ir a mi perfil →</a>
        </section>
      }
    </section>
  `,
})
export class DashboardPage {
  readonly auth = inject(AuthStore);
  readonly sections = [
    {
      path: '/experiencias',
      symbol: '◈',
      title: 'Experiencias',
      description: 'Crea, edita y organiza el catálogo de experiencias.',
    },
    {
      path: '/eventos',
      symbol: '▦',
      title: 'Eventos',
      description: 'Gestiona las fechas y la disponibilidad de cada evento.',
    },
    {
      path: '/categorias',
      symbol: '#',
      title: 'Categorías',
      description: 'Organiza el catálogo para encontrar cada experiencia.',
    },
    {
      path: '/organizadores',
      symbol: '◎',
      title: 'Organizadores',
      description: 'Administra los responsables de tus experiencias.',
    },
    {
      path: '/lugares',
      symbol: '⌖',
      title: 'Lugares',
      description: 'Mantén al día las ubicaciones y puntos de encuentro.',
    },
    {
      path: '/roles',
      symbol: '◇',
      title: 'Roles',
      description: 'Consulta y gestiona el catálogo de roles.',
    },
  ];
}
