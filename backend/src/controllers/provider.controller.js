'use strict';

const asyncHandler = require('../utils/asyncHandler');
const catalogProviderService = require('../services/catalogProvider.service');
const { buildLogoPublicUrl, buildBrochurePublicUrl } = require('../utils/fileStorage');

const registerProvider = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.registerProvider(req.validatedBody);
  res.status(201).json({ success: true, message: data.message, data });
});

const trainingDashboard = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.getTrainingProviderDashboard(req.user);
  res.json({ success: true, data });
});

const institutionDashboard = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.getInstitutionProviderDashboard(req.user);
  res.json({ success: true, data });
});

const updateTrainingProfile = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.updateTrainingCenterProfile(
    req.user.id,
    req.validatedBody
  );
  res.json({ success: true, data });
});

const updateInstitutionProfile = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.updateInstitutionProfile(
    req.user.id,
    req.validatedBody
  );
  res.json({ success: true, data });
});

const uploadTrainingLogo = asyncHandler(async (req, res) => {
  const logoUrl = buildLogoPublicUrl(req.file.filename);
  const data = await catalogProviderService.setTrainingCenterLogo(req.user.id, logoUrl);
  res.json({ success: true, data });
});

const uploadInstitutionLogo = asyncHandler(async (req, res) => {
  const logoUrl = buildLogoPublicUrl(req.file.filename);
  const data = await catalogProviderService.setInstitutionLogo(req.user.id, logoUrl);
  res.json({ success: true, data });
});

const uploadTrainingBrochure = asyncHandler(async (req, res) => {
  const url = buildBrochurePublicUrl(req.file.filename);
  const data = await catalogProviderService.addTrainingCenterBrochure(req.user.id, url);
  res.json({ success: true, data });
});

const uploadInstitutionBrochure = asyncHandler(async (req, res) => {
  const url = buildBrochurePublicUrl(req.file.filename);
  const data = await catalogProviderService.addInstitutionBrochure(req.user.id, url);
  res.json({ success: true, data });
});

const listTrainingCourses = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.listTrainingCourses(req.user.id);
  res.json({ success: true, data });
});

const createTrainingCourse = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.createTrainingCourse(req.user.id, req.validatedBody);
  res.status(201).json({ success: true, data });
});

const updateTrainingCourse = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.updateTrainingCourse(
    req.user.id,
    req.validatedParams.courseId,
    req.validatedBody
  );
  res.json({ success: true, data });
});

const deleteTrainingCourse = asyncHandler(async (req, res) => {
  await catalogProviderService.deleteTrainingCourse(
    req.user.id,
    req.validatedParams.courseId
  );
  res.json({ success: true, message: 'Formation supprimée' });
});

const listInstitutionPrograms = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.listInstitutionPrograms(req.user.id);
  res.json({ success: true, data });
});

const addInstitutionProgram = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.addInstitutionProgram(
    req.user.id,
    req.validatedBody
  );
  res.status(201).json({ success: true, data });
});

const updateInstitutionProgram = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.updateInstitutionProgram(
    req.user.id,
    req.validatedParams.index,
    req.validatedBody
  );
  res.json({ success: true, data });
});

const deleteInstitutionProgram = asyncHandler(async (req, res) => {
  const data = await catalogProviderService.deleteInstitutionProgram(
    req.user.id,
    req.validatedParams.index
  );
  res.json({ success: true, data });
});

module.exports = {
  registerProvider,
  trainingDashboard,
  institutionDashboard,
  updateTrainingProfile,
  updateInstitutionProfile,
  uploadTrainingLogo,
  uploadInstitutionLogo,
  uploadTrainingBrochure,
  uploadInstitutionBrochure,
  listTrainingCourses,
  createTrainingCourse,
  updateTrainingCourse,
  deleteTrainingCourse,
  listInstitutionPrograms,
  addInstitutionProgram,
  updateInstitutionProgram,
  deleteInstitutionProgram,
};
