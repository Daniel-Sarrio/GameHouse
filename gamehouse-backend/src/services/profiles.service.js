const profiles = require('../repos/profiles.repo');
const AppError = require('./utils/app-error');
const { canAccessUserResource } = require('./utils/permissions');

const getProfile = async (user, id) => {
  const profile = id === 'me' ? await profiles.findByUserId(user.id) : await profiles.findById(id);
  if (!profile) throw new AppError('Resource not found', 404);
  if (!canAccessUserResource(user, profile)) throw new AppError('You do not have permission to access this resource', 403);
  return profile;
};
const updateProfile = async (user, id, data) => {
  const profile = await getProfile(user, id);
  const updated = await profiles.update(profile.id, data);
  if (!updated) throw new AppError('Resource not found', 404);
  return updated;
};
module.exports = { getProfile, updateProfile };
