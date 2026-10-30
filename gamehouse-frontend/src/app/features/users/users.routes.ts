import { Routes } from '@angular/router';
export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/users-admin/users-admin').then((m) => m.UsersAdmin),
  },
];
