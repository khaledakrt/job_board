'use strict';

const companyService = require('../services/company.service');
const asyncHandler = require('../utils/asyncHandler');

const listCompanies = asyncHandler(async (req, res) => {
  const companies = await companyService.listCompaniesForRecruiter(req.recruiter);

  res.status(200).json({
    success: true,
    data: companies,
  });
});

const getCompany = asyncHandler(async (req, res) => {
  const company = await companyService.getCompanyById(req.validatedParams.id);

  res.status(200).json({
    success: true,
    data: company,
  });
});

const createCompany = asyncHandler(async (req, res) => {
  const company = await companyService.createCompany({
    userId: req.user.id,
    payload: req.validatedBody,
  });

  res.status(201).json({
    success: true,
    message: 'Company created successfully',
    data: company,
  });
});

const updateCompany = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompany({
    companyId: req.validatedParams.id,
    recruiter: req.recruiter,
    payload: req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: 'Company updated successfully',
    data: company,
  });
});

const deleteCompany = asyncHandler(async (req, res) => {
  const result = await companyService.deleteCompany({
    companyId: req.validatedParams.id,
    recruiter: req.recruiter,
  });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const updateCompanyLogo = asyncHandler(async (req, res) => {
  const company = await companyService.updateCompanyLogo({
    companyId: req.validatedParams.id,
    recruiter: req.recruiter,
    file: req.file,
  });

  res.status(200).json({
    success: true,
    message: 'Company logo updated successfully',
    data: company,
  });
});

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanyLogo,
};
