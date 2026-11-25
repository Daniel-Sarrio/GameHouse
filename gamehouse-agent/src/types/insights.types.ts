// Análisis de opiniones: lo que envía el backend de GameHouse y lo que responde el agente.

/** Aspectos que el agente puede valorar. Lista cerrada: el frontend asocia un icono a cada uno. */
export const ASPECT_KEYS = [
  'organizacion', 'ambiente', 'instalaciones', 'equipamiento', 'personal', 'calidad_precio', 'diversion', 'ubicacion',
] as const;
export type AspectKey = (typeof ASPECT_KEYS)[number];

export interface ReviewComment {
  rating: number;
  body: string;
}

export interface InsightsRequestBody {
  experience: { name: string; categories: string[] };
  comments: ReviewComment[];
}

export interface AspectRating {
  key: AspectKey;
  /** De 1 a 5 en pasos de 0,5. */
  rating: number;
  /** Comentarios que mencionan el aspecto. */
  mentions: number;
}

export interface InsightsResponseBody {
  analyzedCount: number;
  /** Comentarios cuyo autor recomienda la experiencia. */
  recommendCount: number;
  aspects: AspectRating[];
  /** Resumen breve en texto plano de lo que opinan los usuarios. */
  summary: string;
}
