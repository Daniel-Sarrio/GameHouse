-- Análisis de opiniones generado por el agente IA, en caché por experiencia.
-- "signature" identifica el conjunto de comentarios analizado: si cambia (comentario nuevo o borrado),
-- el análisis está desactualizado y se vuelve a pedir al agente. Así el modelo no se llama en cada visita.
CREATE TABLE IF NOT EXISTS comment_insights (
  experience_id INTEGER PRIMARY KEY REFERENCES experiences(id) ON DELETE CASCADE,
  signature CHAR(32) NOT NULL,
  analyzed_count INTEGER NOT NULL CHECK (analyzed_count > 0),
  recommend_count INTEGER NOT NULL CHECK (recommend_count BETWEEN 0 AND analyzed_count),
  aspects JSONB NOT NULL DEFAULT '[]',
  summary TEXT NOT NULL DEFAULT '',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
