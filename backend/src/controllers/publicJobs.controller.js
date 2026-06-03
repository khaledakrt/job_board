'use strict';

const publicJobSearchService = require('../services/publicJobSearch.service');
const asyncHandler = require('../utils/asyncHandler');

const searchJobs = asyncHandler(async (req, res) => {
  const result = await publicJobSearchService.searchJobs(req.validatedQuery);

  res.status(200).json({
    success: true,
    data: result.items,
    pagination: result.pagination,
  });
});

const getJobById = asyncHandler(async (req, res) => {
  const job = await publicJobSearchService.getPublicJobById(req.validatedParams.id);

  res.status(200).json({
    success: true,
    data: job,
  });
});

module.exports = {
  searchJobs,
  getJobById,
};
