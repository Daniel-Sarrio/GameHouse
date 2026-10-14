import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertService } from './alert.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly alerts = inject(AlertService);

  get<T>(path: string): Promise<T> {
    return this.send(this.http.get<T>(this.url(path)));
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

  private async send<T>(request: Observable<T>): Promise<T> {
    try {
      return await firstValueFrom(request.pipe(timeout(environment.apiTimeoutMs)));
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        const message = 'La petición ha tardado demasiado. Inténtalo de nuevo.';
        this.alerts.error(message);
        throw new Error(message);
      }
      throw error;
    }
  }
}
