// Comentarios de una experiencia (GET/POST/DELETE /api/shop/experiences/:slug/comments).

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENTS_PAGE_SIZE = 10;

export type CommentSort = 'recent' | 'rating_desc' | 'rating_asc';
export const COMMENT_SORT_OPTIONS: { value: CommentSort; label: string }[] = [
  { value: 'recent', label: 'Más recientes' },
  { value: 'rating_desc', label: 'Mejor valoradas' },
  { value: 'rating_asc', label: 'Peor valoradas' },
];

export type CommentRating = 1 | 2 | 3 | 4 | 5;

export interface ExperienceComment {
  id: number;
  rating: CommentRating;
  body: string;
  createdAt: string;
  /** Solo nombre visible y avatar: el servidor no expone email ni id del autor. */
  author: { name: string; avatarUrl: string | null };
  /** true si el usuario de la sesión es el autor o ADMIN. */
  canDelete: boolean;
}

export interface CommentSummary {
  count: number;
  average: number | null;
  distribution: Record<CommentRating, number>;
}

export interface CommentPage {
  items: ExperienceComment[];
  summary: CommentSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Aspectos que puede valorar el agente IA (lista cerrada, igual que en el backend). */
export type AspectKey = 'organizacion' | 'ambiente' | 'instalaciones' | 'equipamiento' | 'personal'
  | 'calidad_precio' | 'diversion' | 'ubicacion';

export interface AspectRating {
  key: AspectKey;
  label: string;
  /** De 1 a 5 en pasos de 0,5. */
  rating: number;
  mentions: number;
}

/**
 * Análisis de las opiniones hecho por el agente IA (GET .../comments/insights).
 * - ready: análisis disponible. stale: no incluye las últimas opiniones; refreshing: el agente prepara uno nuevo.
 * - pending: el agente está generando el primer análisis (se vuelve a consultar).
 * - insufficient: aún no hay suficientes opiniones para analizarlas.
 * - unavailable: el agente no está disponible y no hay análisis previo.
 */
export type CommentInsights =
  | { status: 'ready'; stale: boolean; refreshing: boolean; analyzedCount: number; recommendCount: number; recommendPercent: number;
      aspects: AspectRating[]; summary: string; generatedAt: string }
  | { status: 'pending' }
  | { status: 'insufficient'; minComments: number; commentCount: number }
  | { status: 'unavailable' };

export interface NewComment {
  rating: CommentRating;
  body: string;
}
