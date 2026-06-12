'use strict';

const asyncHandler = require('../utils/asyncHandler');
const catalogOfferingsService = require('../services/catalogOfferings.service');
const catalogParticipationsService = require('../services/catalogParticipations.service');

const listProviderFormations = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.listProviderFormations(
    req.user.id,
    req.validatedQuery ?? {}
  );
  if (result?.pagination) {
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

const getProviderFormation = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.getProviderFormation(
    req.user.id,
    req.validatedParams.formationId
  );
  res.json({ success: true, data });
});

const createProviderFormation = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.createProviderFormation(
    req.user.id,
    req.validatedBody
  );
  const isDraft = data.status === 'draft';
  res.status(201).json({
    success: true,
    data,
    message: isDraft
      ? 'Brouillon de formation enregistré.'
      : 'Formation envoyée. Elle sera visible après validation par un administrateur.',
  });
});

const updateProviderFormation = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.updateProviderFormation(
    req.user.id,
    req.validatedParams.formationId,
    req.validatedBody
  );
  res.json({
    success: true,
    data,
    message: data.status === 'draft'
      ? 'Brouillon de formation enregistré.'
      : 'Formation enregistrée.',
  });
});

const deleteProviderFormation = asyncHandler(async (req, res) => {
  await catalogOfferingsService.deleteProviderFormation(
    req.user.id,
    req.validatedParams.formationId
  );
  res.json({ success: true, message: 'Formation supprimée' });
});

const listProviderEvents = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.listProviderEvents(
    req.user.id,
    req.validatedQuery ?? {}
  );
  if (result?.pagination) {
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

const getProviderEvent = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.getProviderEvent(
    req.user.id,
    req.validatedParams.eventId
  );
  res.json({ success: true, data });
});

const createProviderEvent = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.createProviderEvent(
    req.user.id,
    req.validatedBody
  );
  const isDraft = data.status === 'draft';
  res.status(201).json({
    success: true,
    data,
    message: isDraft
      ? 'Brouillon d’événement enregistré.'
      : 'Événement envoyé. Il sera visible après validation par un administrateur.',
  });
});

const updateProviderEvent = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.updateProviderEvent(
    req.user.id,
    req.validatedParams.eventId,
    req.validatedBody
  );
  res.json({
    success: true,
    data,
    message: data.status === 'draft'
      ? 'Brouillon d’événement enregistré.'
      : 'Événement enregistré.',
  });
});

const deleteProviderEvent = asyncHandler(async (req, res) => {
  await catalogOfferingsService.deleteProviderEvent(
    req.user.id,
    req.validatedParams.eventId
  );
  res.json({ success: true, message: 'Événement supprimé' });
});

const uploadCatalogImages = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  const urls = await catalogOfferingsService.uploadCatalogImages(files);
  res.json({ success: true, data: { urls } });
});

const getFormation = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.getPublishedFormationById(
    req.validatedParams.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const getEvent = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.getPublishedEventById(
    req.validatedParams.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const listCenterFormations = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.listPublishedFormationsForCenter(
    req.validatedParams.centerId,
    req.validatedQuery ?? {}
  );
  if (result?.pagination) {
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

const listCenterEvents = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.listPublishedEventsForCenter(
    req.validatedParams.centerId,
    req.validatedQuery ?? {}
  );
  if (result?.pagination) {
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

const participateFormation = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.participateFormation(
    req.validatedParams.id,
    req.user,
    req.validatedBody.participationType
  );
  res.json({ success: true, data });
});

const participateEvent = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.participateEvent(
    req.validatedParams.id,
    req.user,
    req.validatedBody.participationType
  );
  res.json({ success: true, data });
});

const adminListFormations = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.adminListFormations(req.validatedQuery);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const adminListEvents = asyncHandler(async (req, res) => {
  const result = await catalogOfferingsService.adminListEvents(req.validatedQuery);
  res.json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const adminSetFormationStatus = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.adminSetFormationStatus(
    req.validatedParams.id,
    req.validatedBody.status,
    req.validatedBody.adminNote
  );
  res.json({ success: true, data });
});

const adminSetEventStatus = asyncHandler(async (req, res) => {
  const data = await catalogOfferingsService.adminSetEventStatus(
    req.validatedParams.id,
    req.validatedBody.status,
    req.validatedBody.adminNote
  );
  res.json({ success: true, data });
});

const listProviderParticipations = asyncHandler(async (req, res) => {
  const result = await catalogParticipationsService.listProviderParticipations(
    req.user.id,
    req.validatedQuery
  );
  if (result?.pagination) {
    return res.json({ success: true, data: result, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

module.exports = {
  listProviderParticipations,
  listProviderFormations,
  getProviderFormation,
  createProviderFormation,
  updateProviderFormation,
  deleteProviderFormation,
  listProviderEvents,
  getProviderEvent,
  createProviderEvent,
  updateProviderEvent,
  deleteProviderEvent,
  uploadCatalogImages,
  getFormation,
  getEvent,
  listCenterFormations,
  listCenterEvents,
  participateFormation,
  participateEvent,
  adminListFormations,
  adminListEvents,
  adminSetFormationStatus,
  adminSetEventStatus,
};
