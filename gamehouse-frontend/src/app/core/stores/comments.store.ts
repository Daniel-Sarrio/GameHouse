import { Injectable, computed, inject, signal } from '@angular/core';
import { CommentSummary, ExperienceComment, NewComment } from '../models/comment.model';
import { isAbortError } from '../services/api.service';
import { CommentService } from '../services/comment.service';

const EMPTY_SUMMARY: CommentSummary = { count: 0, average: null, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };

/** Estado de los comentarios de la experiencia abierta en el detalle. */
@Injectable({ providedIn: 'root' })
export class CommentsStore {
  private readonly service = inject(CommentService);
  private controller?: AbortController;

  readonly slug = signal<string | null>(null);
  readonly comments = signal<ExperienceComment[]>([]);
  readonly summary = signal<CommentSummary>(EMPTY_SUMMARY);
  readonly page = signal(1);
  readonly totalPages = signal(1);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);

  readonly hasMore = computed(() => this.page() < this.totalPages());

  /** Carga la primera página. También se usa al iniciar o cerrar sesión, porque cambia `canDelete`. */
  async load(slug: string): Promise<void> {
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    if (this.slug() !== slug) {
      this.comments.set([]);
      this.summary.set(EMPTY_SUMMARY);
    }
    this.slug.set(slug);
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await this.service.list(slug, 1, controller.signal);
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

  async loadMore(): Promise<void> {
    const slug = this.slug();
    if (!slug || !this.hasMore() || this.loadingMore()) return;
    this.loadingMore.set(true);
    try {
      const result = await this.service.list(slug, this.page() + 1);
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

  async create(comment: NewComment): Promise<void> {
    const slug = this.slug();
    if (!slug) return;
    await this.service.create(slug, comment);
    await this.load(slug);
  }

  async remove(id: number): Promise<void> {
    const slug = this.slug();
    if (!slug) return;
    await this.service.remove(slug, id);
    await this.load(slug);
  }

  cancel(): void {
    this.controller?.abort();
    this.controller = undefined;
    this.loading.set(false);
  }
}
