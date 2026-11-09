import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EmptyError, Observable, firstValueFrom, fromEvent, takeUntil, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertService } from './alert.service';

export type QueryValue = string | number | boolean | readonly (string | number)[] | null | undefined;

export interface GetOptions {
  /** Se omiten los valores vacíos; los arrays se envían separados por comas. */
  params?: Record<string, QueryValue>;
  /** Al abortar se cancela la petición HTTP y la promesa se rechaza con un AbortError. */
  signal?: AbortSignal;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly alerts = inject(AlertService);

  get<T>(path: string, options: GetOptions = {}): Promise<T> {
    const params = this.toParams(options.params);
    return this.send(this.http.get<T>(this.url(path), { params }), options.signal);
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.post<T>(this.url(path), body));
  }

  patch<T>(path: string, body: unknown): Promise<T> {
    return this.send(this.http.patch<T>(this.url(path), body));
  }

  delete<T>(path: string): Promise<T> {
    return this.send(this.http.delete<T>(this.url(path)));
  }

  private url(path: string): string {
    return `${environment.apiUrl}/${path.replace(/^\/+/, '')}`;
  }

  private toParams(values: GetOptions['params'] = {}): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(values)) {
      if (value === null || value === undefined || value === '') continue;
      if (Array.isArray(value)) {
        if (value.length) params = params.set(key, value.join(','));
      } else {
        params = params.set(key, String(value));
      }
    }
    return params;
  }

  private async send<T>(request: Observable<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) throw abortError();
    // Desuscribirse cancela la petición en curso: la respuesta antigua nunca llega al store.
    const cancellable = signal ? request.pipe(takeUntil(fromEvent(signal, 'abort'))) : request;
    try {
      return await firstValueFrom(cancellable.pipe(timeout(environment.apiTimeoutMs)));
    } catch (error) {
      if (error instanceof EmptyError && signal?.aborted) throw abortError();
      if (error instanceof Error && error.name === 'TimeoutError') {
        const message = 'La petición ha tardado demasiado. Inténtalo de nuevo.';
        this.alerts.error(message);
        throw new Error(message);
      }
      throw error;
    }
  }
}

const abortError = () => new DOMException('La petición se ha cancelado.', 'AbortError');

export const isAbortError = (error: unknown): boolean => error instanceof DOMException && error.name === 'AbortError';
