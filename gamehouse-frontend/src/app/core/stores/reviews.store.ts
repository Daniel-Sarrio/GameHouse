import { Injectable, computed, inject, signal } from '@angular/core';
import { CommentSort } from '../models/comment.model';
import { AdminCommentPage, AnalysisState, ReviewExperience } from '../models/review.model';
import { ReviewService } from '../services/review.service';

// Mientras el agente IA analiza (puede tardar con modelos lentos) se vuelve a consultar.
const POLL_MS = 4_000;
const MAX_POLLS = 45;

/** Estado de la página de opiniones del panel de administración (se crea con la página). */
@Injectable()
export class ReviewsStore {
  private readonly service = inject(ReviewService);
  private pollTimer?: ReturnType<typeof setTimeout>;
  private request = 0;

  readonly experiences = signal<ReviewExperience[]>([]);
  readonly loadingExperiences = signal(false);
  readonly selectedId = signal<number | null>(null);
  readonly comments = signal<AdminCommentPage | null>(null);
  readonly loadingComments = signal(false);
  readonly sort = signal<CommentSort>('recent');
  readonly page = signal(1);
  readonly analysis = signal<AnalysisState | null>(null);
  readonly analyzing = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = computed(() => this.experiences().find((item) => item.id === this.selectedId()) ?? null);
  readonly generating = computed(() => this.analyzing() || !!this.analysis()?.generating);

  async loadExperiences(): Promise<void> {
    this.loadingExperiences.set(true);
    this.error.set(null);
    try {
      this.experiences.set(await this.service.experiences());
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar las opiniones.');
    } finally {
      this.loadingExperiences.set(false);
    }
  }

  /** Selecciona una experiencia y carga sus comentarios y su análisis. */
  async select(id: number | null): Promise<void> {
    clearTimeout(this.pollTimer);
    const request = ++this.request;
    this.selectedId.set(id);
    this.comments.set(null);
    this.analysis.set(null);
    this.page.set(1);
    if (id === null) return;
    await Promise.all([this.loadComments(request), this.refreshAnalysis(request)]);
  }

  async setSort(sort: CommentSort): Promise<void> {
    this.sort.set(sort);
    this.page.set(1);
    await this.loadComments(this.request);
  }

  async setPage(page: number): Promise<void> {
    this.page.set(page);
    await this.loadComments(this.request);
  }

  /** Botón "Analizar opiniones": el agente trabaja en segundo plano y se consulta hasta que termine. */
  async analyze(): Promise<void> {
    const id = this.selectedId();
    if (id === null || this.generating()) return;
    const request = this.request;
    this.analyzing.set(true);
    try {
      const state = await this.service.analyze(id);
      if (request !== this.request) return;
      this.analysis.set(state);
      this.schedulePoll(request, 0, state.analysis?.generatedAt ?? null);
    } finally {
      this.analyzing.set(false);
    }
  }

  async removeComment(commentId: number): Promise<void> {
    await this.service.removeComment(commentId);
    await Promise.all([this.loadComments(this.request), this.refreshAnalysis(this.request), this.loadExperiences()]);
  }

  destroy(): void {
    clearTimeout(this.pollTimer);
    this.request++;
  }

  private async loadComments(request: number): Promise<void> {
    const id = this.selectedId();
    if (id === null) return;
    this.loadingComments.set(true);
    try {
      const page = await this.service.comments(id, this.page(), this.sort());
      if (request === this.request) this.comments.set(page);
    } catch (error) {
      if (request === this.request) this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los comentarios.');
    } finally {
      if (request === this.request) this.loadingComments.set(false);
    }
  }

  private async refreshAnalysis(request: number): Promise<AnalysisState | null> {
    const id = this.selectedId();
    if (id === null) return null;
    const state = await this.service.analysis(id);
    if (request !== this.request) return null;
    this.analysis.set(state);
    return state;
  }

  private schedulePoll(request: number, poll: number, previousGeneratedAt: string | null): void {
    clearTimeout(this.pollTimer);
    if (poll >= MAX_POLLS) return;
    this.pollTimer = setTimeout(async () => {
      const state = await this.refreshAnalysis(request).catch(() => null);
      if (!state || request !== this.request) return;
      if (state.generating) {
        this.schedulePoll(request, poll + 1, previousGeneratedAt);
      } else if (state.analysis?.generatedAt !== previousGeneratedAt) {
        // Análisis nuevo: se actualiza también la lista (fecha y estado "al día").
        void this.loadExperiences();
      }
    }, POLL_MS);
  }
}
