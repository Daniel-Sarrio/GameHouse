import { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    title: 'Categorías · GameHouse',
    loadComponent: () => import('./pages/category-list/category-list').then((m) => m.CategoryList),
  },
  {
    path: 'nuevo',
    title: 'Nueva categoría · GameHouse',
    loadComponent: () => import('./pages/category-create/category-create').then((m) => m.CategoryCreate),
  },
  {
    path: ':slug/editar',
    title: 'Editar categoría · GameHouse',
    loadComponent: () => import('./pages/category-edit/category-edit').then((m) => m.CategoryEdit),
  },
  {
    path: ':slug',
    title: 'Detalle de categoría · GameHouse',
    loadComponent: () => import('./pages/category-detail/category-detail').then((m) => m.CategoryDetail),
  },
];
