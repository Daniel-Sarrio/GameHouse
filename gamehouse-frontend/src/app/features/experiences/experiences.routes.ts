import { Routes } from '@angular/router';

export const EXPERIENCES_ROUTES: Routes = [
  {
    path: '',
    title: 'Experiencias · GameHouse',
    loadComponent: () => import('./pages/experience-list/eventos-page').then((m) => m.EventosPage),
  },
  {
    path: 'experiencias',
    title: 'Experiencias · GameHouse',
    loadComponent: () => import('./pages/experience-list/eventos-page').then((m) => m.EventosPage),
  },
  {
    path: 'experiencias/nuevo',
    title: 'Crear experiencia · GameHouse',
    loadComponent: () => import('./pages/experience-create/experience-create').then((m) => m.ExperienceCreate),
  },
  {
    path: 'experiencias/:id/editar',
    title: 'Editar experiencia · GameHouse',
    loadComponent: () => import('./pages/experience-edit/experience-edit').then((m) => m.ExperienceEdit),
  },
  {
    path: 'experiencias/:slug',
    title: 'Detalle · GameHouse',
    loadComponent: () => import('./pages/experience-detail/evento-detalle-page').then((m) => m.EventoDetallePage),
  },
];
