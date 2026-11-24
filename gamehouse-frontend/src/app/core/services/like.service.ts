import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { LikeState, MyLikes } from '../models/like.model';
import { ApiService } from './api.service';

/**
 * Likes a experiencias. Pasa por ApiService: el interceptor de auth envía las cookies de sesión
 * y, si el access token caducó, lo renueva con /auth/refresh antes de reintentar.
 */
@Injectable({ providedIn: 'root' })
export class LikeService {
  private readonly api = inject(ApiService);

  async mine(): Promise<number[]> {
    return (await this.api.get<RespuestaApi<MyLikes>>('likes')).data.experienceIds;
  }

  async like(slug: string): Promise<LikeState> {
    return (await this.api.post<RespuestaApi<LikeState>>(`likes/${encodeURIComponent(slug)}`, {})).data;
  }

  async unlike(slug: string): Promise<LikeState> {
    return (await this.api.delete<RespuestaApi<LikeState>>(`likes/${encodeURIComponent(slug)}`)).data;
  }
}
