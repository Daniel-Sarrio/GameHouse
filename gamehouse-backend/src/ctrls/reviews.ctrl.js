const service = require('../services/reviews.service');

const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};

module.exports = {
  experiences: respond(() => service.listExperiences()),
  comments: respond((req) => service.listComments(req.params.id, req.query)),
  removeComment: respond((req) => service.deleteComment(req.params.id, req.user)),
  analysis: respond((req) => service.getAnalysis(req.params.id)),
  // 202: el análisis se genera en segundo plano; el cliente consulta GET .../analysis.
  analyze: respond((req) => service.analyze(req.params.id), 202),
};
