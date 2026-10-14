import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { RespuestaError } from '../models/api.model';
import { AlertService } from '../services/alert.service';

export const errorInterceptor: HttpInterceptorFn = (request, next) => {
  const alerts = inject(AlertService);
  return next(request).pipe(catchError((error: unknown) => {
    if (!(error instanceof HttpErrorResponse)) return throwError(() => error);
    let message: string;
    if (error.status === 0) {
      message = 'No se puede conectar con el servidor. Comprueba que el backend está iniciado.';
    } else {
      const response = error.error as RespuestaError | null;
      const detail = response?.errors?.map((item) => item.message).join(' ');
      message = detail || response?.message || (error.status >= 500
        ? 'Error del servidor. Inténtalo de nuevo más tarde.'
        : 'Ha ocurrido un error inesperado.');
    }
    alerts.error(message);
    return throwError(() => new Error(message));
  }));
};
