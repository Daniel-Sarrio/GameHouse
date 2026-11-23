import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { COMMENTS_PAGE_SIZE, CommentPage, ExperienceComment, NewComment } from '../models/comment.model';
import { ApiService } from './api.service';

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

  async list(slug: string, page = 1, signal?: AbortSignal): Promise<CommentPage> {
    const params = { page, limit: COMMENTS_PAGE_SIZE };
    return (await this.api.get<RespuestaApi<CommentPage>>(this.path(slug), { params, signal })).data;
  }

  async create(slug: string, comment: NewComment): Promise<ExperienceComment> {
    return (await this.api.post<RespuestaApi<ExperienceComment>>(this.path(slug), comment)).data;
  }

  async remove(slug: string, id: number): Promise<void> {
    await this.api.delete(`${this.path(slug)}/${id}`);
  }
}
