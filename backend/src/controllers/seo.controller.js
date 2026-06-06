'use strict';

const publicJobSearchService = require('../services/publicJobSearch.service');
const publicCompanyService = require('../services/publicCompany.service');
const publicCatalogService = require('../services/publicCatalog.service');
const catalogOfferingsService = require('../services/catalogOfferings.service');
const {
  renderJobSeoHtml,
  renderHomeSeoHtml,
  renderCompanySeoHtml,
  renderTrainingCentersListSeoHtml,
  renderTrainingCenterSeoHtml,
  renderFormationSeoHtml,
  renderTrainingEventSeoHtml,
  renderPrivateInstitutionsListSeoHtml,
  renderPrivateInstitutionSeoHtml,
  renderInstitutionOfferingSeoHtml,
} = require('../utils/seoHtml');
const asyncHandler = require('../utils/asyncHandler');

function sendSeoHtml(res, html) {
  res
    .status(200)
    .type('html')
    .set('Cache-Control', 'public, max-age=300')
    .send(html);
}

const renderHome = asyncHandler(async (req, res) => {
  sendSeoHtml(res, await renderHomeSeoHtml());
});

const renderPublicJob = asyncHandler(async (req, res) => {
  const job = await publicJobSearchService.getPublicJobPreviewById(req.params.id);
  sendSeoHtml(res, await renderJobSeoHtml(job));
});

const renderPublicCompany = asyncHandler(async (req, res) => {
  const { company } = await publicCompanyService.getPublicCompanyProfile(req.params.id, {
    page: 1,
    limit: 1,
  });
  sendSeoHtml(res, await renderCompanySeoHtml(company));
});

const renderTrainingCentersList = asyncHandler(async (req, res) => {
  sendSeoHtml(res, await renderTrainingCentersListSeoHtml());
});

const renderTrainingCenter = asyncHandler(async (req, res) => {
  const center = await publicCatalogService.getTrainingCenterById(req.params.id);
  sendSeoHtml(res, await renderTrainingCenterSeoHtml(center));
});

const renderFormation = asyncHandler(async (req, res) => {
  const formation = await catalogOfferingsService.getPublishedFormationById(req.params.id);
  sendSeoHtml(res, await renderFormationSeoHtml(formation));
});

const renderTrainingEvent = asyncHandler(async (req, res) => {
  const event = await catalogOfferingsService.getPublishedEventById(req.params.id);
  sendSeoHtml(res, await renderTrainingEventSeoHtml(event));
});

const renderPrivateInstitutionsList = asyncHandler(async (req, res) => {
  sendSeoHtml(res, await renderPrivateInstitutionsListSeoHtml());
});

const renderPrivateInstitution = asyncHandler(async (req, res) => {
  const institution = await publicCatalogService.getPrivateInstitutionById(req.params.id);
  sendSeoHtml(res, await renderPrivateInstitutionSeoHtml(institution));
});

const renderInstitutionOffering = asyncHandler(async (req, res) => {
  const offering = await publicCatalogService.getPublishedInstitutionOfferingPreviewById(
    req.params.id
  );
  sendSeoHtml(res, await renderInstitutionOfferingSeoHtml(offering));
});

module.exports = {
  renderHome,
  renderPublicJob,
  renderPublicCompany,
  renderTrainingCentersList,
  renderTrainingCenter,
  renderFormation,
  renderTrainingEvent,
  renderPrivateInstitutionsList,
  renderPrivateInstitution,
  renderInstitutionOffering,
};
