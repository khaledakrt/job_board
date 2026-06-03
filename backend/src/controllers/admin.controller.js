'use strict';

const adminService = require('../services/admin.service');
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
  const data = await adminService.banUser(req.validatedParams.id, req.validatedBody);
  res.status(200).json({ success: true, message: 'User banned', data });
});

const unbanUser = asyncHandler(async (req, res) => {
  const data = await adminService.unbanUser(req.validatedParams.id);
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

const updateJobStatus = asyncHandler(async (req, res) => {
  const data = await adminService.updateJobStatus(
    req.validatedParams.id,
    req.validatedBody.status
  );
  res.status(200).json({ success: true, message: 'Job updated', data });
});

const deleteJob = asyncHandler(async (req, res) => {
  const result = await adminService.deleteJob(req.validatedParams.id);
  res.status(200).json({ success: true, message: result.message });
});

const listCompanies = asyncHandler(async (req, res) => {
  const result = await adminService.listCompanies(req.validatedQuery || {});
  res.status(200).json({ success: true, data: result.items, pagination: result.pagination });
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
  updateJobStatus,
  deleteJob,
  listCompanies,
};
