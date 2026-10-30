import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

export const adminGuard: CanActivateFn = async (_, state) => {
  const auth = inject(AuthService);
  const store = inject(AuthStore);
  const router = inject(Router);
  if (!(await auth.validateSession()))
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return store.isAdmin() || router.createUrlTree(['/sin-acceso']);
};
