import { Routes } from '@angular/router';
import { MainLayout } from './layouts/main-layout/main-layout';
import { authGuard } from './auth/auth.guard';
import { adminGuard } from './auth/admin.guard';

export const routes: Routes = [
  { path: 'login', title: 'Acceso · GameHouse', loadComponent: () => import('./auth/login.page').then(m => m.LoginPage) },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard · GameHouse', loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage) },
      { path: 'perfil', title: 'Mi perfil · GameHouse', loadComponent: () => import('./features/profile/profile.page').then(m => m.ProfilePage) },
      { path: 'usuarios', canActivate: [adminGuard], title: 'Usuarios · GameHouse', loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES) },
      { path: 'sin-acceso', title: 'Acceso restringido · GameHouse', loadComponent: () => import('./auth/access-denied.page').then(m => m.AccessDeniedPage) },
      {
        path: '',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadChildren: () => import('./features/experiences/experiences.routes').then((m) => m.EXPERIENCES_ROUTES),
      },
      {
        path: 'categorias',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadChildren: () => import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      {
        path: 'organizadores',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadChildren: () => import('./features/organizers/organizers.routes').then((m) => m.ORGANIZERS_ROUTES),
      },
      {
        path: 'lugares',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'roles',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
        loadChildren: () => import('./features/roles/roles.routes').then((m) => m.ROLES_ROUTES),
      },
      {
        path: 'eventos',
        canActivate: [adminGuard],
        canActivateChild: [adminGuard],
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
