'use strict';

const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/institutionOfferings.service');

const listProviderOfferings = asyncHandler(async (req, res) => {
  const result = await service.listProviderOfferings(req.user.id, req.validatedQuery);
  if (result?.pagination) {
    return res.json({ success: true, data: result.items, pagination: result.pagination });
  }
  res.json({ success: true, data: result });
});

const getProviderOffering = asyncHandler(async (req, res) => {
  const data = await service.getProviderOffering(req.user.id, req.validatedParams.offeringId);
  res.json({ success: true, data });
});

const createProviderOffering = asyncHandler(async (req, res) => {
  const data = await service.createProviderOffering(
    req.user.id,
    req.validatedParams.offeringType,
    req.validatedBody
  );
  res.status(201).json({ success: true, data, message: 'Contenu enregistré.' });
});

const updateProviderOffering = asyncHandler(async (req, res) => {
  const data = await service.updateProviderOffering(
    req.user.id,
    req.validatedParams.offeringId,
    req.validatedBody
  );
  res.json({ success: true, data, message: 'Contenu mis à jour.' });
});

const deleteProviderOffering = asyncHandler(async (req, res) => {
  await service.deleteProviderOffering(req.user.id, req.validatedParams.offeringId);
  res.json({ success: true, message: 'Contenu supprimé.' });
});

module.exports = {
  listProviderOfferings,
  getProviderOffering,
  createProviderOffering,
  updateProviderOffering,
  deleteProviderOffering,
};
