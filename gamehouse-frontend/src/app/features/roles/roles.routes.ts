import { Routes } from '@angular/router';
export const ROLES_ROUTES: Routes = [
  { path: '', title: 'Roles · GameHouse', loadComponent: () => import('./pages/role-list/role-list').then((m) => m.RoleList) },
  { path: 'nuevo', title: 'Nuevo rol · GameHouse', loadComponent: () => import('./pages/role-create/role-create').then((m) => m.RoleCreate) },
  { path: ':id/editar', title: 'Editar rol · GameHouse', loadComponent: () => import('./pages/role-edit/role-edit').then((m) => m.RoleEdit) },
  { path: ':id', title: 'Detalle de rol · GameHouse', loadComponent: () => import('./pages/role-detail/role-detail').then((m) => m.RoleDetail) },
];
