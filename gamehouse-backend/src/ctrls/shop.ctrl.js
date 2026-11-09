const service = require('../services/shop.service');

// Endpoints públicos de solo lectura: cada controlador envía sus errores a next(error).
const respond = (action) => async (req, res, next) => {
  try {
    const data = await action(req);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getCategories = respond(() => service.getCategories());
const getHosts = respond(() => service.getHosts());
const getLocations = respond(() => service.getLocations());
const getExperiences = respond((req) => service.getExperiences(req.query));
const getExperienceBySlug = respond((req) => service.getExperienceBySlug(req.params.slug));
const getDepartures = respond((req) => service.getDepartures(req.params.slug));

module.exports = { getCategories, getHosts, getLocations, getExperiences, getExperienceBySlug, getDepartures };
