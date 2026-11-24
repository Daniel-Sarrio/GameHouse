import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthStore } from '../../auth/auth.store';
import { LikeTarget } from '../models/like.model';
import { LikeService } from '../services/like.service';

/**
 * Likes del usuario de la sesión, compartidos por la tarjeta del shop y el detalle.
 * Sin sesión no se pide nada: GET /api/likes exige el middleware auth.
 */
@Injectable({ providedIn: 'root' })
export class LikesStore {
  private readonly service = inject(LikeService);
  private readonly auth = inject(AuthStore);
  private revision = 0;
  private readonly userId = computed(() => this.auth.user()?.id ?? null);

  /** IDs de experiencias con like del usuario actual. */
  readonly likedIds = signal<ReadonlySet<number>>(new Set());
  /** Contadores actualizados tras dar o quitar like; si no hay, se usa el que vino del shop. */
  private readonly counts = signal<ReadonlyMap<number, number>>(new Map());
  /** Experiencias con una petición de like en curso (evita dobles clics). */
  readonly pending = signal<ReadonlySet<number>>(new Set());

  constructor() {
    // Al iniciar o cerrar sesión (o cambiar de usuario) se recargan o se vacían los likes. Se depende solo
    // del id: revalidar la sesión al recuperar el foco crea otro objeto usuario y no debe recargar nada.
    effect(() => {
      const userId = this.userId();
      untracked(() => void this.load(userId ?? undefined));
    });
  }

  isLiked(id: number): boolean {
    return this.likedIds().has(id);
  }

  isPending(id: number): boolean {
    return this.pending().has(id);
  }

  count(target: LikeTarget): number {
    return this.counts().get(target.id) ?? target.likeCount;
  }

  /** Da o quita el like con actualización optimista; si falla, se revierte y se resincroniza. */
  async toggle(target: LikeTarget): Promise<void> {
    if (!this.auth.isAuthenticated() || this.isPending(target.id)) return;
    const wasLiked = this.isLiked(target.id);
    const previousCount = this.count(target);
    this.setPending(target.id, true);
    this.apply(target.id, !wasLiked, Math.max(0, previousCount + (wasLiked ? -1 : 1)));
    try {
      const state = wasLiked ? await this.service.unlike(target.slug) : await this.service.like(target.slug);
      this.apply(state.experienceId, state.liked, state.likeCount);
    } catch (error) {
      this.apply(target.id, wasLiked, previousCount);
      void this.load(this.auth.user()?.id);
      throw error;
    } finally {
      this.setPending(target.id, false);
    }
  }

  private async load(userId: string | undefined): Promise<void> {
    const revision = ++this.revision;
    this.counts.set(new Map());
    if (!userId) {
      this.likedIds.set(new Set());
      return;
    }
    try {
      const ids = await this.service.mine();
      if (revision === this.revision) this.likedIds.set(new Set(ids));
    } catch {
      if (revision === this.revision) this.likedIds.set(new Set());
    }
  }

  private apply(id: number, liked: boolean, count: number): void {
    this.likedIds.update((ids) => {
      const next = new Set(ids);
      if (liked) next.add(id); else next.delete(id);
      return next;
    });
    this.counts.update((counts) => new Map(counts).set(id, count));
  }

  private setPending(id: number, value: boolean): void {
    this.pending.update((ids) => {
      const next = new Set(ids);
      if (value) next.add(id); else next.delete(id);
      return next;
    });
  }
}
