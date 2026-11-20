import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import { isApiUrl } from './auth.utils';

// Endpoints de la propia sesión: un 401 aquí es la respuesta final, no se renueva.
const SESSION_ENDPOINT = /\/auth\/(login|register|refresh|logout)(?:\?|$)/;
const isUnauthorized = (error: unknown): error is HttpErrorResponse =>
  error instanceof HttpErrorResponse && error.status === 401;

/**
 * Envía las cookies HttpOnly a la API (withCredentials) y gestiona la caducidad del access token:
 * - Primer 401: POST /auth/refresh y se reintenta la petición una sola vez.
 * - Segundo 401 (refresh rechazado o reintento rechazado): logout.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiUrl(request.url)) return next(request);
  const withCookies = request.clone({ withCredentials: true });
  if (SESSION_ENDPOINT.test(request.url)) return next(withCookies);

  const auth = inject(AuthService);
  const store = inject(AuthStore);
  // Una respuesta de una sesión anterior no debe cerrar una sesión iniciada después.
  const revision = store.revision();
  const sameSession = () => revision === store.revision();

  return next(withCookies).pipe(
    catchError((error: unknown) => {
      if (!isUnauthorized(error)) return throwError(() => error);
      return from(auth.refreshSession()).pipe(
        switchMap((renewed) => {
          if (!renewed) {
            if (sameSession()) auth.endSession();
            return throwError(() => error);
          }
          return next(withCookies).pipe(
            catchError((retryError: unknown) => {
              // Hay sesión (el refresh funcionó) pero sigue sin autorizar: se cierra.
              if (isUnauthorized(retryError) && sameSession()) auth.endSession(true);
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
