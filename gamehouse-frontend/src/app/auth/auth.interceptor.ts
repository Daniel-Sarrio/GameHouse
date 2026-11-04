import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { isApiUrl } from './auth.utils';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiUrl(request.url)) return next(request);
  const store = inject(AuthStore);
  const revision = store.revision();
  return next(request.clone({ withCredentials: true })).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401
        && !/\/auth\/(login|register)(?:\?|$)/.test(request.url) && revision === store.revision()) store.logout();
      return throwError(() => error);
    }),
  );
};
