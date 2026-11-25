import { Injectable, inject } from '@angular/core';
import { RespuestaApi } from '../models/api.model';
import { CommentSort } from '../models/comment.model';
import { AdminCommentPage, AnalysisState, ReviewExperience } from '../models/review.model';
import { ApiService } from './api.service';

/** Opiniones del panel de administración. El backend exige sesión y rol ADMIN en todas las rutas. */
@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly api = inject(ApiService);

  async experiences(): Promise<ReviewExperience[]> {
    return (await this.api.get<RespuestaApi<ReviewExperience[]>>('reviews/experiences')).data;
  }

  async comments(experienceId: number, page = 1, sort: CommentSort = 'recent'): Promise<AdminCommentPage> {
    const params = { page, limit: 20, sort };
    return (await this.api.get<RespuestaApi<AdminCommentPage>>(`reviews/experiences/${experienceId}/comments`, { params })).data;
  }

  async analysis(experienceId: number): Promise<AnalysisState> {
    return (await this.api.get<RespuestaApi<AnalysisState>>(`reviews/experiences/${experienceId}/analysis`)).data;
  }

  /** Lanza el análisis en segundo plano; después hay que consultar analysis() hasta que termine. */
  async analyze(experienceId: number): Promise<AnalysisState> {
    return (await this.api.post<RespuestaApi<AnalysisState>>(`reviews/experiences/${experienceId}/analysis`, {})).data;
  }

  async removeComment(id: number): Promise<void> {
    await this.api.delete(`reviews/comments/${id}`);
  }
}
