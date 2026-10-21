const service = require('../services/assignments.service');
const respond = (action, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await action(req) }); }
  catch (error) { next(error); }
};
module.exports = {
  getAllAssignments: respond(() => service.getAllAssignments()),
  getAssignmentById: respond((req) => service.getAssignmentById(req.params.experienceId, req.params.categoryId)),
  createAssignment: respond((req) => service.createAssignment(req.body), 201),
  updateAssignment: respond((req) => service.updateAssignment(req.params.experienceId, req.params.categoryId, req.body)),
  deleteAssignment: respond((req) => service.deleteAssignment(req.params.experienceId, req.params.categoryId)),
};
