const service = require('../services/events.service');

// Cada controlador envía sus errores al middleware común mediante next(error).
const getAllEvents = async (req, res, next) => {
  try {
    const data = await service.getAllEvents();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getFormOptions = async (req, res, next) => {
  try {
    const data = await service.getFormOptions();
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const data = await service.getEventById(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getEventBySku = async (req, res, next) => {
  try {
    const data = await service.getEventBySku(req.params.sku);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const data = await service.createEvent(req.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const data = await service.updateEvent(req.params.id, req.body);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const data = await service.deleteEvent(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const activateEvent = async (req, res, next) => {
  try {
    const data = await service.activateEvent(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const deactivateEvent = async (req, res, next) => {
  try {
    const data = await service.deactivateEvent(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  activateEvent,
  deactivateEvent,
  getAllEvents,
  getFormOptions,
  getEventById,
  getEventBySku,
  createEvent,
  updateEvent,
  deleteEvent,
};
