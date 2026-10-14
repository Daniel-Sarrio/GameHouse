import { Routes } from '@angular/router';

export const EXPERIENCES_ROUTES: Routes = [
  {
    path: '',
    title: 'Experiencias · GameHouse',
    loadComponent: () => import('./pages/experience-list/eventos-page').then((m) => m.EventosPage),
  },
  {
    path: 'eventos',
    title: 'Experiencias · GameHouse',
    loadComponent: () => import('./pages/experience-list/eventos-page').then((m) => m.EventosPage),
  },
  {
    path: 'eventos/nuevo',
    title: 'Crear evento · GameHouse',
    loadComponent: () => import('./pages/experience-create/experience-create').then((m) => m.ExperienceCreate),
  },
  {
    path: 'eventos/:slug/editar',
    title: 'Editar evento · GameHouse',
    loadComponent: () => import('./pages/experience-edit/experience-edit').then((m) => m.ExperienceEdit),
  },
  {
    path: 'eventos/:slug',
    title: 'Detalle · GameHouse',
    loadComponent: () => import('./pages/experience-detail/evento-detalle-page').then((m) => m.EventoDetallePage),
  },
];
