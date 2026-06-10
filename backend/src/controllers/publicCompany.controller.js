'use strict';

const publicCompanyService = require('../services/publicCompany.service');
const asyncHandler = require('../utils/asyncHandler');

const listPublicCompanies = asyncHandler(async (req, res) => {
  const result = await publicCompanyService.listPublicCompanies(req.validatedQuery);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const getPublicProfile = asyncHandler(async (req, res) => {
  const result = await publicCompanyService.getPublicCompanyProfile(
    req.validatedParams.id,
    req.validatedQuery
  );

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  listPublicCompanies,
  getPublicProfile,
};
