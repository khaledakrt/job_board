'use strict';

const { RecruiterProfile, User, Company } = require('../models');
const { env } = require('../config');
const emailService = require('./email.service');
const { COMPANY_ROLES, USER_ROLES } = require('../config/constants');
const ApiError = require('../utils/ApiError');
const { generateUuid } = require('../utils/uuid');
const { hashPassword } = require('../utils/password');
const tokenService = require('./token.service');
const logger = require('../utils/logger');

const TEAM_MEMBER_LIMIT = 10;

function formatTeamMember(profile) {
  return {
    id: profile.id,
    userId: profile.user_id,
    email: profile.user?.email || null,
    jobTitle: profile.job_title,
    phone: profile.phone,
    companyRole: profile.company_role,
    canPostJob: profile.can_post_job,
    canDecideApplication: profile.can_decide_application,
    canEditCompany: profile.can_edit_company,
    updatedAt: profile.updated_at,
  };
}

async function listTeamMembers(companyId) {
  const members = await RecruiterProfile.findAll({
    where: { company_id: companyId },
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_verified'] }],
    order: [['updated_at', 'DESC']],
  });

  return members.map(formatTeamMember);
}

async function inviteTeamMember({ owner, payload }) {
  const currentMembersCount = await RecruiterProfile.count({
    where: { company_id: owner.company_id },
  });

  if (currentMembersCount >= TEAM_MEMBER_LIMIT) {
    throw ApiError.badRequest(`Team member limit reached (${TEAM_MEMBER_LIMIT} users maximum)`);
  }

  const existingUser = await User.findOne({ where: { email: payload.email } });

  if (existingUser) {
    if (existingUser.role !== USER_ROLES.RECRUITER) {
      throw ApiError.badRequest('User exists with a non-recruiter account');
    }

    const existingProfile = await RecruiterProfile.findOne({
      where: { user_id: existingUser.id },
    });

    if (existingProfile) {
      throw ApiError.conflict('User is already assigned to a company');
    }
  }

  if (payload.companyRole === COMPANY_ROLES.OWNER) {
    throw ApiError.badRequest('Cannot invite another owner. Transfer ownership is not supported yet.');
  }

  const temporaryPassword = payload.password || tokenService.generateSecureToken(16);
  const passwordHash = await hashPassword(temporaryPassword);

  const transaction = await User.sequelize.transaction();
  let created;
  let userForInvite;
  let isNewAccount = false;

  try {
    let user = existingUser;

    if (!user) {
      isNewAccount = true;
      user = await User.create(
        {
          id: generateUuid(),
          email: payload.email,
          password_hash: passwordHash,
          role: USER_ROLES.RECRUITER,
          is_verified: true,
          verification_token: null,
          reset_token: null,
          reset_expires: null,
          created_at: new Date(),
        },
        { transaction }
      );
    }

    const profile = await RecruiterProfile.create(
      {
        id: generateUuid(),
        user_id: user.id,
        company_id: owner.company_id,
        job_title: payload.jobTitle || null,
        phone: payload.phone || null,
        company_role: COMPANY_ROLES.RECRUITER,
        can_post_job: payload.canPostJob ?? false,
        can_decide_application: payload.canDecideApplication ?? false,
        can_edit_company: payload.canEditCompany ?? false,
        updated_at: new Date(),
      },
      { transaction }
    );

    created = await RecruiterProfile.findByPk(profile.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      transaction,
    });
    userForInvite = user;

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const company = await Company.findByPk(owner.company_id, { attributes: ['name'] });
  const inviter = await User.findByPk(owner.user_id, { attributes: ['email'] });
  let emailSent = false;

  try {
    await emailService.sendTeamInviteEmail({
      to: userForInvite.email,
      companyName: company?.name || 'votre entreprise',
      inviterEmail: inviter?.email || env.SMTP_FROM_EMAIL,
      temporaryPassword: isNewAccount && !payload.password ? temporaryPassword : undefined,
      isNewAccount,
    });
    emailSent = true;
  } catch (error) {
    logger.warn(`[RecruiterTeam] invite email failed for ${userForInvite.email}: ${error.message}`);
  }

  return {
    member: formatTeamMember(created),
    temporaryPassword: payload.password ? undefined : temporaryPassword,
    emailSent,
  };
}

async function updateTeamMemberPermissions({ owner, memberId, payload }) {
  const member = await RecruiterProfile.findOne({
    where: { id: memberId, company_id: owner.company_id },
    include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
  });

  if (!member) {
    throw ApiError.notFound('Team member not found');
  }

  if (member.company_role === COMPANY_ROLES.OWNER) {
    throw ApiError.forbidden('Cannot modify the company owner permissions');
  }

  if (member.id === owner.id) {
    throw ApiError.forbidden('Use a dedicated flow to update your own profile');
  }

  const updates = { updated_at: new Date() };

  if (Object.prototype.hasOwnProperty.call(payload, 'jobTitle')) {
    updates.job_title = payload.jobTitle;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    updates.phone = payload.phone;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'canPostJob')) {
    updates.can_post_job = payload.canPostJob;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'canDecideApplication')) {
    updates.can_decide_application = payload.canDecideApplication;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'canEditCompany')) {
    updates.can_edit_company = payload.canEditCompany;
  }

  await member.update(updates);

  await member.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'email'] }] });

  return formatTeamMember(member);
}

async function removeTeamMember({ owner, memberId }) {
  const member = await RecruiterProfile.findOne({
    where: { id: memberId, company_id: owner.company_id },
    include: [{ model: User, as: 'user' }],
  });

  if (!member) {
    throw ApiError.notFound('Team member not found');
  }

  if (member.company_role === COMPANY_ROLES.OWNER) {
    throw ApiError.forbidden('Cannot remove the company owner');
  }

  if (member.id === owner.id) {
    throw ApiError.forbidden('You cannot remove yourself from the team');
  }

  const userId = member.user_id;

  await member.destroy();
  await User.destroy({ where: { id: userId } });

  return { message: 'Team member removed successfully' };
}

module.exports = {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberPermissions,
  removeTeamMember,
};
