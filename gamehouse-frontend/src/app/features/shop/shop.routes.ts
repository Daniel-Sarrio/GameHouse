import { Routes } from '@angular/router';

// Rutas públicas: home, listado (filtros/búsqueda/página en la URL) y detalle por slug.
export const SHOP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'GameHouse · Experiencias gaming',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'tienda',
    title: 'Tienda · GameHouse',
    loadComponent: () => import('./pages/shop/shop.page').then((m) => m.ShopPage),
  },
  {
    path: 'tienda/:slug',
    title: 'Experiencia · GameHouse',
    loadComponent: () =>
      import('./pages/experience-detail/shop-experience-detail.page').then((m) => m.ShopExperienceDetailPage),
  },
];
