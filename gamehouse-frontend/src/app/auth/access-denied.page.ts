import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-access-denied',
  imports: [RouterLink],
  template: `<section class="mx-auto max-w-xl p-10 text-center">
    <p class="text-sm font-bold text-indigo-600">ACCESO RESTRINGIDO</p>
    <h1 class="my-4 text-3xl font-bold">Esta sección requiere el rol ADMIN</h1>
    <p class="mb-8 text-slate-500">Puedes seguir accediendo a tu dashboard y a tu perfil.</p>
    <a routerLink="/dashboard" class="boton boton-primario">Volver al dashboard</a>
  </section>`,
})
export class AccessDeniedPage {}
