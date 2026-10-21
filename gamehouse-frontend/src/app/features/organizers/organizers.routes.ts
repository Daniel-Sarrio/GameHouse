import { Routes } from '@angular/router';

export const ORGANIZERS_ROUTES: Routes = [
  {
    path: '',
    title: 'Organizadores · GameHouse',
    loadComponent: () => import('./pages/organizer-list/organizer-list').then((m) => m.OrganizerList),
  },
  {
    path: 'nuevo',
    title: 'Nuevo organizador · GameHouse',
    loadComponent: () => import('./pages/organizer-create/organizer-create').then((m) => m.OrganizerCreate),
  },
  {
    path: ':slug/editar',
    title: 'Editar organizador · GameHouse',
    loadComponent: () => import('./pages/organizer-edit/organizer-edit').then((m) => m.OrganizerEdit),
  },
  {
    path: ':slug',
    title: 'Detalle de organizador · GameHouse',
    loadComponent: () => import('./pages/organizer-detail/organizer-detail').then((m) => m.OrganizerDetail),
  },
];
