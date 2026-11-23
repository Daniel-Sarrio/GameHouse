// Comentarios de una experiencia (GET/POST/DELETE /api/shop/experiences/:slug/comments).

export const COMMENT_MAX_LENGTH = 1000;
export const COMMENTS_PAGE_SIZE = 10;

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

export interface NewComment {
  rating: CommentRating;
  body: string;
}
