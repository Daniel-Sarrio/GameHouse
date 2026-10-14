import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (request, next) => {
  const loading = inject(LoadingService);
  const blocking = request.method !== 'GET';
  loading.show(blocking);
  return next(request).pipe(finalize(() => loading.hide(blocking)));
};
