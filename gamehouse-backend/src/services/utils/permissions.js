const isOwnerOrAdmin = (user, resource) => Boolean(user && resource && (
  user.role === 'ADMIN' || (resource.userId != null && user.id === resource.userId)
));
// Las experiencias obtienen userId mediante experiences.host_id -> hosts.user_id.
module.exports = { isOwnerOrAdmin, canAccessUserResource: isOwnerOrAdmin, canModifyExperience: isOwnerOrAdmin };
