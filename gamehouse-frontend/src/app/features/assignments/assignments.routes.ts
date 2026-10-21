import { Routes } from '@angular/router';
export const ASSIGNMENTS_ROUTES: Routes = [
  { path: '', title: 'Categorías por experiencia · GameHouse', loadComponent: () => import('./pages/assignment-list/assignment-list').then((m) => m.AssignmentList) },
  { path: 'nuevo', title: 'Nueva asignación · GameHouse', loadComponent: () => import('./pages/assignment-create/assignment-create').then((m) => m.AssignmentCreate) },
  { path: ':experienceId/:categoryId/editar', title: 'Editar asignación · GameHouse', loadComponent: () => import('./pages/assignment-edit/assignment-edit').then((m) => m.AssignmentEdit) },
  { path: ':experienceId/:categoryId', title: 'Detalle de asignación · GameHouse', loadComponent: () => import('./pages/assignment-detail/assignment-detail').then((m) => m.AssignmentDetail) },
];
