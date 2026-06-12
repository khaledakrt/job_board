'use strict';

const adminService = require('../services/admin.service');
const publicCatalogService = require('../services/publicCatalog.service');
const asyncHandler = require('../utils/asyncHandler');

const getStats = asyncHandler(async (req, res) => {
  const data = await adminService.getStats();
  res.status(200).json({ success: true, data });
});

const listUsers = asyncHandler(async (req, res) => {
  const result = await adminService.listUsers(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getUser = asyncHandler(async (req, res) => {
  const data = await adminService.getUserById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const listUserLoginEvents = asyncHandler(async (req, res) => {
  const result = await adminService.listUserLoginEvents(
    req.validatedParams.id,
    req.validatedQuery
  );
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const createUser = asyncHandler(async (req, res) => {
  const data = await adminService.createUser(req.validatedBody);
  res.status(201).json({ success: true, message: 'User created', data });
});

const updateUser = asyncHandler(async (req, res) => {
  const data = await adminService.updateUser(
    req.validatedParams.id,
    req.validatedBody,
    req.user.id
  );
  res.status(200).json({ success: true, message: 'User updated', data });
});

const setUserPassword = asyncHandler(async (req, res) => {
  const result = await adminService.setUserPassword(
    req.validatedParams.id,
    req.validatedBody.password
  );
  res.status(200).json({ success: true, message: result.message });
});

const banUser = asyncHandler(async (req, res) => {
  const data = await adminService.banUser(req.validatedParams.id, req.validatedBody, req.user.id);
  res.status(200).json({ success: true, message: 'User banned', data });
});

const unbanUser = asyncHandler(async (req, res) => {
  const data = await adminService.unbanUser(req.validatedParams.id, req.user.id);
  res.status(200).json({ success: true, message: 'User unbanned', data });
});

const deleteUser = asyncHandler(async (req, res) => {
  const result = await adminService.deleteUser(req.validatedParams.id, req.user.id);
  res.status(200).json({ success: true, message: result.message });
});

const listJobs = asyncHandler(async (req, res) => {
  const result = await adminService.listJobs(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getJob = asyncHandler(async (req, res) => {
  const data = await adminService.getJobById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const updateJobStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateJobStatus(
    req.validatedParams.id,
    req.validatedBody.status,
    req.user.id
  );
  res.status(200).json({ success: true, message: 'Job updated', data });
});

const deleteJob = asyncHandler(async (req, res) => {
  const result = await adminService.deleteJob(req.validatedParams.id, req.user.id);
  res.status(200).json({ success: true, message: result.message });
});

const listApplications = asyncHandler(async (req, res) => {
  const result = await adminService.listApplications(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getApplication = asyncHandler(async (req, res) => {
  const data = await adminService.getApplicationById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const listCompanies = asyncHandler(async (req, res) => {
  const result = await adminService.listCompanies(req.validatedQuery || {});
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getCompany = asyncHandler(async (req, res) => {
  const data = await adminService.getCompanyById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const listTrainingCenters = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.adminListTrainingCenters(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminGetTrainingCenterById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const createTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminCreateTrainingCenter(req.validatedBody);
  res.status(201).json({ success: true, message: 'Centre créé', data });
});

const updateTrainingCenter = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminUpdateTrainingCenter(
    req.validatedParams.id,
    req.validatedBody
  );
  res.status(200).json({ success: true, message: 'Centre mis à jour', data });
});

const updateTrainingCenterStatus = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminUpdateTrainingCenterStatus(
    req.validatedParams.id,
    req.validatedBody.status
  );
  res.status(200).json({ success: true, message: 'Statut mis à jour', data });
});

const listPrivateInstitutions = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.adminListPrivateInstitutions(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const getPrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminGetPrivateInstitutionById(req.validatedParams.id);
  res.status(200).json({ success: true, data });
});

const createPrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminCreatePrivateInstitution(req.validatedBody);
  res.status(201).json({ success: true, message: 'Établissement créé', data });
});

const updatePrivateInstitution = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminUpdatePrivateInstitution(
    req.validatedParams.id,
    req.validatedBody
  );
  res.status(200).json({ success: true, message: 'Établissement mis à jour', data });
});

const updatePrivateInstitutionStatus = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminUpdatePrivateInstitutionStatus(
    req.validatedParams.id,
    req.validatedBody.status
  );
  res.status(200).json({ success: true, message: 'Statut mis à jour', data });
});

const listInstitutionOfferings = asyncHandler(async (req, res) => {
  const result = await publicCatalogService.adminListInstitutionOfferings(req.validatedQuery);
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
});

const updateInstitutionOfferingStatus = asyncHandler(async (req, res) => {
  const data = await publicCatalogService.adminUpdateInstitutionOfferingStatus(
    req.validatedParams.id,
    req.validatedBody.status,
    req.validatedBody.adminNote
  );
  res.status(200).json({ success: true, message: 'Publication mise à jour', data });
});

module.exports = {
  getStats,
  listUsers,
  getUser,
  listUserLoginEvents,
  createUser,
  updateUser,
  setUserPassword,
  banUser,
  unbanUser,
  deleteUser,
  listJobs,
  getJob,
  updateJobStatus,
  deleteJob,
  listApplications,
  getApplication,
  listCompanies,
  getCompany,
  listTrainingCenters,
  getTrainingCenter,
  createTrainingCenter,
  updateTrainingCenter,
  updateTrainingCenterStatus,
  listPrivateInstitutions,
  getPrivateInstitution,
  createPrivateInstitution,
  updatePrivateInstitution,
  updatePrivateInstitutionStatus,
  listInstitutionOfferings,
  updateInstitutionOfferingStatus,
};
