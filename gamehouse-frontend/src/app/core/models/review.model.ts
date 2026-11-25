// Opiniones en el panel de administración (/api/reviews, solo ADMIN).
import { AspectRating, CommentRating, CommentSummary } from './comment.model';

/** Experiencia con opiniones, publicada o no. */
export interface ReviewExperience {
  id: number;
  name: string;
  slug: string;
  status: string;
  imageUrl: string | null;
  commentCount: number;
  average: number;
  lastCommentAt: string;
  analyzedAt: string | null;
  /** true si el último análisis incluye todas las opiniones actuales. */
  analysisFresh: boolean;
}

export interface AdminComment {
  id: number;
  rating: CommentRating;
  body: string;
  createdAt: string;
  author: { name: string | null; email: string };
}

export interface AdminCommentPage {
  experience: { id: number; name: string; slug: string; status: string };
  items: AdminComment[];
  summary: CommentSummary;
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

/** Balanza de sentimiento: comentarios positivos, neutros y negativos; score de -1 a 1. */
export interface SentimentBalance {
  positive: number;
  neutral: number;
  negative: number;
  score: number;
}

export interface AdminAnalysis {
  /** true si no incluye las opiniones más recientes. */
  stale: boolean;
  analyzedCount: number;
  recommendCount: number;
  recommendPercent: number;
  aspects: AspectRating[];
  summary: string;
  positives: string[];
  negatives: string[];
  sentiment: SentimentBalance;
  generatedAt: string;
}

export interface AnalysisState {
  commentCount: number;
  /** El agente IA está analizando las opiniones ahora mismo. */
  generating: boolean;
  lastFailedAt: string | null;
  analysis: AdminAnalysis | null;
}
