const experiencesService = require('../services/experiences.service');

const getAllExperiences = async (req, res, next) => {
  try {
    const experiences = await experiencesService.getAllExperiences();

    res.status(200).json({
      success: true,
      data: experiences,
    });
  } catch (error) {
    next(error);
  }
};

const getExperienceById = async (req, res, next) => {
  try {
    const experience = await experiencesService.getExperienceById(req.params.id);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const getExperienceBySlug = async (req, res, next) => {
  try {
    const experience = await experiencesService.getExperienceBySlug(req.params.slug);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const createExperience = async (req, res, next) => {
  try {
    const experience = await experiencesService.createExperience(req.body);
    res.status(201).json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const updateExperience = async (req, res, next) => {
  try {
    const experience = await experiencesService.updateExperience(req.params.id, req.body);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const deleteExperience = async (req, res, next) => {
  try {
    const experience = await experiencesService.deleteExperience(req.params.id);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const activateExperience = async (req, res, next) => {
  try {
    const experience = await experiencesService.activateExperience(req.params.id);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

const deactivateExperience = async (req, res, next) => {
  try {
    const experience = await experiencesService.deactivateExperience(req.params.id);
    res.json({ success: true, data: experience });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllExperiences,
  getExperienceById,
  getExperienceBySlug,
  createExperience,
  updateExperience,
  activateExperience,
  deactivateExperience,
  deleteExperience,
};
