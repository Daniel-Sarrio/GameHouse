import { Injectable, computed, inject, signal } from '@angular/core';
import { CommentInsights, CommentSort, CommentSummary, ExperienceComment, NewComment } from '../models/comment.model';
import { isAbortError } from '../services/api.service';
import { CommentService } from '../services/comment.service';

// Mientras el agente genera el análisis (puede tardar con modelos lentos), se vuelve a consultar.
const INSIGHTS_POLL_MS = 5_000;
const INSIGHTS_MAX_POLLS = 30;

const EMPTY_SUMMARY: CommentSummary = { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

/** Estado de los comentarios de la experiencia abierta en el detalle y de su análisis por el agente IA. */
@Injectable({ providedIn: 'root' })
export class CommentsStore {
  private readonly service = inject(CommentService);
  private controller?: AbortController;
  private insightsController?: AbortController;
  private pollTimer?: ReturnType<typeof setTimeout>;

  readonly slug = signal<string | null>(null);
  readonly comments = signal<ExperienceComment[]>([]);
  readonly summary = signal<CommentSummary>(EMPTY_SUMMARY);
  readonly sort = signal<CommentSort>('recent');
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);

  readonly insights = signal<CommentInsights | null>(null);
  readonly insightsLoading = signal(false);

  readonly hasMore = computed(() => this.page() < this.totalPages());

  /** Carga la primera página. También se usa al iniciar o cerrar sesión, porque cambia `canDelete`. */
  async load(slug: string): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    if (this.slug() !== slug) {
      this.comments.set([]);
      this.summary.set(EMPTY_SUMMARY);
      this.insights.set(null);
      this.sort.set('recent');
    }
    this.slug.set(slug);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(slug, 1, this.sort(), controller.signal);
      this.comments.set(result.items);
      this.summary.set(result.summary);
      this.page.set(1);
      this.totalPages.set(result.pagination.totalPages);
    } catch (error) {
      if (isAbortError(error)) return;
      this.error.set(error instanceof Error ? error.message : 'No se pudieron cargar los comentarios.');
    } finally {
      if (this.controller === controller) this.loading.set(false);
    }
  }

  /**
   * Pide el análisis del agente IA. No bloquea la lista: si tarda o falla, solo afecta a su bloque.
   * El backend lo tiene en caché y solo vuelve a llamar al modelo si los comentarios han cambiado.
   */
  async loadInsights(slug: string, poll = 0): Promise<void> {
    clearTimeout(this.pollTimer);
    this.insightsController?.abort();
    const controller = new AbortController();
    this.insightsController = controller;
    this.insightsLoading.set(true);
    try {
      const insights = await this.service.insights(slug, controller.signal);
      if (slug !== this.slug()) return;
      this.insights.set(insights);
      const generating = insights.status === 'pending' || (insights.status === 'ready' && insights.refreshing);
      if (generating && poll < INSIGHTS_MAX_POLLS) {
        this.pollTimer = setTimeout(() => void this.loadInsights(slug, poll + 1), INSIGHTS_POLL_MS);
      }
    } catch (error) {
      if (isAbortError(error)) return;
      if (slug === this.slug()) this.insights.set({ status: 'unavailable' });
    } finally {
      if (this.insightsController === controller) this.insightsLoading.set(false);
    }
  }

  async setSort(sort: CommentSort): Promise<void> {
    const slug = this.slug();
    if (!slug || sort === this.sort()) return;
    this.sort.set(sort);
    await this.load(slug);
  }

  async loadMore(): Promise<void> {
    const slug = this.slug();
    if (!slug || !this.hasMore() || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const result = await this.service.list(slug, this.page() + 1, this.sort());
      if (slug !== this.slug()) return;
      // Un comentario nuevo desplaza la paginación: se evita repetir los que ya se muestran.
      const known = new Set(this.comments().map((comment) => comment.id));
      this.comments.update((current) => [...current, ...result.items.filter((comment) => !known.has(comment.id))]);
      this.summary.set(result.summary);
      this.page.set(result.pagination.page);
      this.totalPages.set(result.pagination.totalPages);
    } finally {
      this.loadingMore.set(false);
    }
  }

  /** Publicar o borrar cambia las opiniones: se recargan la lista y el análisis del agente. */
  async create(comment: NewComment): Promise<void> {
    const slug = this.slug();
    if (!slug) return;
    await this.service.create(slug, comment);
    await this.load(slug);
    void this.loadInsights(slug);
  }

  async remove(id: number): Promise<void> {
    const slug = this.slug();
    if (!slug) return;
    await this.service.remove(slug, id);
    await this.load(slug);
    void this.loadInsights(slug);
  }

  cancel(): void {
    clearTimeout(this.pollTimer);
    this.controller?.abort();
    this.insightsController?.abort();
    this.controller = undefined;
    this.insightsController = undefined;
    this.loading.set(false);
    this.insightsLoading.set(false);
  }
}
