import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthStore } from './auth.store';
import { isApiUrl, tokenExpiresAt } from './auth.utils';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(AuthStore);
  if (!isApiUrl(request.url) || /\/auth\/(login|register)(?:\?|$)/.test(request.url))
    return next(request);
  const token = store.token();
  if (token && tokenExpiresAt(token) <= Date.now()) {
    store.logout();
    return throwError(
      () => new HttpErrorResponse({ status: 401, error: { message: 'Tu sesión ha caducado.' } }),
    );
  }
  return next(
    token ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request,
  ).pipe(
    catchError((error: unknown) => {
      // Una respuesta antigua no debe cerrar una sesión iniciada después.
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        token &&
        token === store.token()
      )
        store.logout();
      return throwError(() => error);
    }),
  );
};
