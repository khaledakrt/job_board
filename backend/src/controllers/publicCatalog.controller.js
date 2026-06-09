'use strict';

const asyncHandler = require('../utils/asyncHandler');
const publicCatalogService = require('../services/publicCatalog.service');

const listTrainingCenters = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.listTrainingCenters(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.getTrainingCenterById(req.params.id);
  res.json({ success: true, data });
});

const submitTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.submitTrainingCenter(req.body);
  res.status(201).json({ success: true, data });
});

const listPrivateInstitutions = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.listPrivateInstitutions(req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getPrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.getPrivateInstitutionById(
    req.params.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const getInstitutionOffering = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.getPublishedInstitutionOfferingById(
    req.params.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const participateInstitutionOffering = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.participateInstitutionOffering(
    req.params.id,
    req.user,
    req.validatedBody.participationType
  );
  res.json({ success: true, data });
});

const submitPrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.submitPrivateInstitution(req.body);
  res.status(201).json({ success: true, data });
});

module.exports = {
  listTrainingCenters,
  getTrainingCenter,
  submitTrainingCenter,
  listPrivateInstitutions,
  getPrivateInstitution,
  getInstitutionOffering,
  participateInstitutionOffering,
  submitPrivateInstitution,
};
