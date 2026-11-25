import { Routes } from '@angular/router';

export const REVIEWS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/reviews-admin/reviews-admin').then((m) => m.ReviewsAdmin),
  },
];
