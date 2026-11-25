import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { COMMENTS_PAGE_SIZE, CommentInsights, CommentPage, CommentSort, ExperienceComment, NewComment } from '../models/comment.model';
import { ApiService } from './api.service';

// El agente IA puede tardar en analizar las opiniones la primera vez; el backend corta a los 30 s.
const INSIGHTS_TIMEOUT_MS = 40_000;

/**
 * Comentarios de una experiencia. Pasa por ApiService, así que el interceptor de auth envía las cookies
 * de sesión y, si el access token caducó, lo renueva antes de crear o borrar.
 */
@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly api = inject(ApiService);

  private path(slug: string): string {
    return `shop/experiences/${encodeURIComponent(slug)}/comments`;
  }

  async list(slug: string, page = 1, sort: CommentSort = 'recent', signal?: AbortSignal): Promise<CommentPage> {
    const params = { page, limit: COMMENTS_PAGE_SIZE, sort };
    return (await this.api.get<RespuestaApi<CommentPage>>(this.path(slug), { params, signal })).data;
  }

  /** Análisis de las opiniones hecho por el agente IA (público). */
  async insights(slug: string, signal?: AbortSignal): Promise<CommentInsights> {
    return (await this.api.get<RespuestaApi<CommentInsights>>(`${this.path(slug)}/insights`, { signal, timeoutMs: INSIGHTS_TIMEOUT_MS })).data;
  }

  async create(slug: string, comment: NewComment): Promise<ExperienceComment> {
    return (await this.api.post<RespuestaApi<ExperienceComment>>(this.path(slug), comment)).data;
  }

  async remove(slug: string, id: number): Promise<void> {
    await this.api.delete(`${this.path(slug)}/${id}`);
  }
}
