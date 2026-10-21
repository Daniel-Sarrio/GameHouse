import { Routes } from '@angular/router';
export const LOCATIONS_ROUTES: Routes = [
  { path: '', title: 'Lugares · GameHouse', loadComponent: () => import('./pages/location-list/location-list').then((m) => m.LocationList) },
  { path: 'nuevo', title: 'Nuevo lugar · GameHouse', loadComponent: () => import('./pages/location-create/location-create').then((m) => m.LocationCreate) },
  { path: ':id/editar', title: 'Editar lugar · GameHouse', loadComponent: () => import('./pages/location-edit/location-edit').then((m) => m.LocationEdit) },
  { path: ':id', title: 'Detalle de lugar · GameHouse', loadComponent: () => import('./pages/location-detail/location-detail').then((m) => m.LocationDetail) },
];
