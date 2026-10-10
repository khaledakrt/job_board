'use strict';

const asyncHandler = require('../utils/asyncHandler');
const recruiterCandidatesService = require('../services/recruiterCandidates.service');

const listCandidates = asyncHandler(async (req, res) => {
  const result = await recruiterCandidatesService.listCandidates(req.validatedQuery);
  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
    facets: result.facets,
  });
});

module.exports = {
  listCandidates,
};
