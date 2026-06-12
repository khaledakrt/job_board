'use strict';

const asyncHandler = require('../utils/asyncHandler');
const publicCatalogService = require('../services/publicCatalog.service');

const listTrainingCenters = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.listTrainingCenters(req.validatedQuery ?? req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.getTrainingCenterById(
    req.params.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const listPrivateInstitutions = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.listPrivateInstitutions(req.validatedQuery ?? req.query);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

const getPrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.getPrivateInstitutionById(
    req.params.id,
    req.user?.id ?? null
  );
  res.json({ success: true, data });
});

const listPrivateInstitutionOfferings = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.listPublishedInstitutionOfferingsForInstitution(
    req.validatedParams.institutionId,
    req.validatedQuery,
    req.user?.id ?? null
  );
  res.json({ success: true, data: result.items, pagination: result.pagination });
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
  const data = await publicCatalogService.submitPrivateInstitution(req.validatedBody);
  res.status(201).json({ success: true, data });
});

module.exports = {
  listTrainingCenters,
  getTrainingCenter,
  listPrivateInstitutions,
  getPrivateInstitution,
  listPrivateInstitutionOfferings,
  getInstitutionOffering,
  participateInstitutionOffering,
  submitPrivateInstitution,
};
