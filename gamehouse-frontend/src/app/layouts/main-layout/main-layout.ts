import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/components/navbar/navbar';
import { Loader } from '../../shared/components/loader/loader';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, Navbar, Loader],
  template: `
    <div class="min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <app-navbar />
      <div class="flex min-w-0 flex-col">
        <app-loader />
        <header class="border-b border-slate-200 bg-white px-6 py-4 sm:px-10">
          <p class="text-sm font-semibold text-slate-900">Panel de administración <span class="ml-2 font-normal text-slate-400">/ Gestión</span></p>
        </header>
        <main class="min-w-0 flex-1"><router-outlet /></main>
        <footer class="border-t border-slate-200 px-6 py-5 text-xs text-slate-500 sm:px-10">GameHouse · Gestión de experiencias</footer>
      </div>
    </div>
  `,
})
export class MainLayout {}
