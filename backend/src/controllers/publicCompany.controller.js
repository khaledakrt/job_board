'use strict';

const publicCompanyService = require('../services/publicCompany.service');
const asyncHandler = require('../utils/asyncHandler');

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
  getPublicProfile,
};
