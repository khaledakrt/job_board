'use strict';

const publicJobSearchService = require('../services/publicJobSearch.service');
const { renderJobSeoHtml } = require('../utils/seoHtml');
const asyncHandler = require('../utils/asyncHandler');

const renderPublicJob = asyncHandler(async (req, res) => {
  const job = await publicJobSearchService.getPublicJobPreviewById(req.params.id);
  const html = await renderJobSeoHtml(job);

  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'public, max-age=300')
    .send(html);
});

module.exports = {
  renderPublicJob,
};
