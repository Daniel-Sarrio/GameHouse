import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideHeart } from '@lucide/angular';
import { AuthStore } from '../../../../auth/auth.store';
import { LikeTarget } from '../../../../core/models/like.model';
import { LikesStore } from '../../../../core/stores/likes.store';

/**
 * Botón de like de una experiencia (tarjeta del shop y detalle). Muestra el contador público;
 * dar o quitar like exige sesión: sin ella lleva al login y vuelve a la página actual.
 */
@Component({
  selector: 'app-like-button',
  imports: [LucideHeart],
  template: `
    <button type="button" class="like" [class.compacto]="compact()" [class.activo]="liked()"
      [attr.aria-pressed]="auth.isAuthenticated() ? liked() : null" [disabled]="pending()"
      [attr.aria-label]="label()" [title]="label()" (click)="toggle($event)">
      <!-- El directivo de Lucide reescribe el class del svg: la clase va en el span que lo envuelve. -->
      <span class="icono"><svg lucideHeart [size]="compact() ? 16 : 18" aria-hidden="true"></svg></span>
      <span aria-hidden="true">{{ count() }}</span>
    </button>
  `,
  styles: [`
    :host { display: inline-flex; }
    .like {
      display: inline-flex; align-items: center; gap: .4rem; padding: .5rem .9rem; border-radius: 999px;
      border: 1.5px solid var(--borde); background: var(--superficie); color: var(--texto-secundario);
      font-size: .9rem; font-weight: 700; transition: border-color .15s, color .15s, transform .15s;
    }
    .like:hover:not(:disabled) { border-color: #fda4af; color: #e11d48; }
    .like:active:not(:disabled) { transform: scale(.94); }
    .like:focus-visible { outline: 3px solid var(--enfoque); outline-offset: 2px; }
    .like:disabled { cursor: progress; opacity: .8; }
    .like.compacto { padding: .3rem .65rem; font-size: .8rem; box-shadow: 0 1px 4px rgb(15 23 42 / .15); }
    .icono { display: inline-flex; }
    .activo { border-color: #fda4af; color: #e11d48; }
    .activo .icono svg { fill: currentColor; }
  `],
})
export class LikeButton {
  readonly experience = input.required<LikeTarget>();
  /** Versión pequeña para la tarjeta del shop. */
  readonly compact = input(false);

  readonly auth = inject(AuthStore);
  private readonly likes = inject(LikesStore);
  private readonly router = inject(Router);

  readonly liked = computed(() => this.likes.isLiked(this.experience().id));
  readonly pending = computed(() => this.likes.isPending(this.experience().id));
  readonly count = computed(() => this.likes.count(this.experience()));
  readonly label = computed(() => {
    const total = `${this.count()} me gusta`;
    if (!this.auth.isAuthenticated()) return `Inicia sesión para dar me gusta (${total})`;
    return this.liked() ? `Quitar me gusta (${total})` : `Me gusta (${total})`;
  });

  toggle(event: Event): void {
    // En la tarjeta, el enlace cubre todo el artículo: el clic del botón no debe navegar al detalle.
    event.preventDefault();
    event.stopPropagation();
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    // El interceptor de errores ya muestra una alerta; el store revierte el estado.
    void this.likes.toggle(this.experience()).catch(() => undefined);
  }
}
