const service = require('../services/likes.service');

module.exports = {
  mine: async (req, res, next) => {
    try { res.json({ success: true, data: await service.getMyLikes(req.user) }); }
    catch (error) { next(error); }
  },
  like: async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await service.likeExperience(req.params.slug, req.user) }); }
    catch (error) { next(error); }
  },
  unlike: async (req, res, next) => {
    try { res.json({ success: true, data: await service.unlikeExperience(req.params.slug, req.user) }); }
    catch (error) { next(error); }
  },
};
