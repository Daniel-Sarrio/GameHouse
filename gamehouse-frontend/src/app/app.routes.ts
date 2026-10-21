import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      {
        path: '',
        loadChildren: () => import('./features/experiences/experiences.routes').then((m) => m.EXPERIENCES_ROUTES),
      },
      {
        path: 'categorias',
        loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'organizadores',
        loadChildren: () => import('./features/organizers/organizers.routes').then((m) => m.ORGANIZERS_ROUTES),
      },
      {
        path: 'lugares',
        loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'roles',
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'eventos',
        loadChildren: () => import('./features/events/events.routes').then((m) => m.EVENTS_ROUTES),
      },
      {
        path: '**',
        title: 'Página no encontrada · GameHouse',
        loadComponent: () => import('./shared/pages/not-found-page/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
