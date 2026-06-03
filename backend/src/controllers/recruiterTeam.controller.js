'use strict';

const recruiterTeamService = require('../services/recruiterTeam.service');
const asyncHandler = require('../utils/asyncHandler');

const listTeam = asyncHandler(async (req, res) => {
  const members = await recruiterTeamService.listTeamMembers(req.companyId);

  res.status(200).json({
    success: true,
    data: members,
  });
});

const inviteMember = asyncHandler(async (req, res) => {
  const result = await recruiterTeamService.inviteTeamMember({
    owner: req.recruiter,
    payload: req.validatedBody,
  });

  res.status(201).json({
    success: true,
    message: 'Team member invited successfully',
    data: result.member,
    meta: result.temporaryPassword
      ? { temporaryPassword: result.temporaryPassword }
      : undefined,
  });
});

const updateMember = asyncHandler(async (req, res) => {
  const member = await recruiterTeamService.updateTeamMemberPermissions({
    owner: req.recruiter,
    memberId: req.validatedParams.memberId,
    payload: req.validatedBody,
  });

  res.status(200).json({
    success: true,
    message: 'Team member permissions updated',
    data: member,
  });
});

const removeMember = asyncHandler(async (req, res) => {
  const result = await recruiterTeamService.removeTeamMember({
    owner: req.recruiter,
    memberId: req.validatedParams.memberId,
  });

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

module.exports = {
  listTeam,
  inviteMember,
  updateMember,
  removeMember,
};
