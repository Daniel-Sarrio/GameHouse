// Comentario público: el autor solo se identifica por su nombre visible y su avatar,
// nunca por su email ni por su id de usuario.
class Comment {
  constructor({ id, rating, body, created_at, user_id, first_name, last_name, avatar_url }, viewer = null) {
    this.id = id;
    this.rating = rating;
    this.body = body;
    this.createdAt = created_at;
    const lastInitial = last_name ? `${last_name.trim().charAt(0)}.` : '';
    this.author = {
      name: [first_name?.trim(), lastInitial].filter(Boolean).join(' ') || 'Usuario de GameHouse',
      avatarUrl: avatar_url ?? null,
    };
    // Lo puede borrar su autor o un ADMIN (moderación).
    this.canDelete = !!viewer && (viewer.id === user_id || viewer.role === 'ADMIN');
  }
}
module.exports = Comment;
