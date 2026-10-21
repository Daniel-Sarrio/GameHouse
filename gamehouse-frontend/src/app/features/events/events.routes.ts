import { Routes } from '@angular/router';
export const EVENTS_ROUTES: Routes = [
  { path: '', title: 'Eventos · GameHouse', loadComponent: () => import('./pages/event-list/event-list').then((m) => m.EventList) },
  { path: 'nuevo', title: 'Nuevo evento · GameHouse', loadComponent: () => import('./pages/event-create/event-create').then((m) => m.EventCreate) },
  { path: ':id/editar', title: 'Editar evento · GameHouse', loadComponent: () => import('./pages/event-edit/event-edit').then((m) => m.EventEdit) },
  { path: ':id', title: 'Detalle de evento · GameHouse', loadComponent: () => import('./pages/event-detail/event-detail').then((m) => m.EventDetail) },
];
