const service = require('../services/comments.service');

module.exports = {
  list: async (req, res, next) => {
    try { res.json({ success: true, data: await service.listComments(req.params.slug, req.query, req.user) }); }
    catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await service.createComment(req.params.slug, req.body, req.user) }); }
    catch (error) { next(error); }
  },
  remove: async (req, res, next) => {
    try { res.json({ success: true, data: await service.deleteComment(req.params.slug, req.params.id, req.user) }); }
    catch (error) { next(error); }
  },
};
