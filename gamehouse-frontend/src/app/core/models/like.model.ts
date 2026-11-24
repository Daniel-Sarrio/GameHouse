// Likes a experiencias (/api/likes). Todas las rutas exigen sesión.

/** Estado tras dar o quitar un like. */
export interface LikeState {
  experienceId: number;
  liked: boolean;
  likeCount: number;
}

/** Experiencias a las que el usuario de la sesión ha dado like. */
export interface MyLikes {
  experienceIds: number[];
}

/** Lo que necesita el botón de like de una experiencia. */
export interface LikeTarget {
  id: number;
  slug: string;
  likeCount: number;
}
