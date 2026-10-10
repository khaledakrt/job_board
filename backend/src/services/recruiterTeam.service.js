'use strict';

const { RecruiterProfile, User, Company, Job, RefreshSession } = require('../models');
const { Op } = require('sequelize');
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
    isBanned: Boolean(profile.user?.is_banned),
    firstName: profile.first_name,
    lastName: profile.last_name,
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
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_verified', 'is_banned'] }],
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

  const initialPassword = tokenService.generateSecureToken(32);
  const passwordHash = await hashPassword(initialPassword);
  const setupToken = tokenService.generateSecureToken();
  const resetExpires = new Date();
  resetExpires.setHours(resetExpires.getHours() + env.PASSWORD_RESET_EXPIRES_HOURS);

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
          verification_expires: null,
          reset_token: tokenService.hashSecureToken(setupToken),
          reset_expires: resetExpires,
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
      include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_banned'] }],
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
      setupToken: isNewAccount ? setupToken : undefined,
      isNewAccount,
    });
    emailSent = true;
  } catch (error) {
    logger.warn(`[RecruiterTeam] invite email failed for ${userForInvite.email}: ${error.message}`);
  }

  return {
    member: formatTeamMember(created),
    devSetPasswordUrl:
      env.NODE_ENV === 'development' && isNewAccount
        ? `${env.CLIENT_URL}/auth/reset-password?token=${encodeURIComponent(setupToken)}`
        : undefined,
    emailSent,
  };
}

async function updateTeamMemberPermissions({ owner, memberId, payload }) {
  const member = await RecruiterProfile.findOne({
    where: { id: memberId, company_id: owner.company_id },
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_banned'] }],
  });

  if (!member) {
    throw ApiError.notFound('Team member not found');
  }

  if (member.id === owner.id) {
    throw ApiError.forbidden('Use your own profile form to update your information');
  }

  const updates = { updated_at: new Date() };

  if (Object.prototype.hasOwnProperty.call(payload, 'firstName')) {
    updates.first_name = payload.firstName || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'lastName')) {
    updates.last_name = payload.lastName || null;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'jobTitle')) {
    updates.job_title = payload.jobTitle;
  }
  if (Object.prototype.hasOwnProperty.call(payload, 'phone')) {
    updates.phone = payload.phone;
  }

  const canPostJob = Boolean(payload.canPostJob);
  const canDecideApplication = Boolean(payload.canDecideApplication);
  const canEditCompany = Boolean(payload.canEditCompany);
  const allRights = canPostJob && canDecideApplication && canEditCompany;
  const nextRole = payload.companyRole === COMPANY_ROLES.OWNER || allRights
    ? COMPANY_ROLES.OWNER
    : COMPANY_ROLES.RECRUITER;

  if (nextRole === COMPANY_ROLES.RECRUITER && member.company_role === COMPANY_ROLES.OWNER) {
    const others = await RecruiterProfile.count({
      where: {
        company_id: owner.company_id,
        company_role: COMPANY_ROLES.OWNER,
        id: { [Op.ne]: member.id },
      },
      include: [{ model: User, as: 'user', where: { is_banned: false }, required: true }],
    });
    if (others < 1) {
      throw ApiError.badRequest('L’entreprise doit garder au moins un administrateur actif.');
    }
  }

  updates.company_role = nextRole;
  updates.can_post_job = nextRole === COMPANY_ROLES.OWNER ? true : canPostJob;
  updates.can_decide_application = nextRole === COMPANY_ROLES.OWNER ? true : canDecideApplication;
  updates.can_edit_company = nextRole === COMPANY_ROLES.OWNER ? true : canEditCompany;

  await member.update(updates);

  await member.reload({ include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_banned'] }] });

  return formatTeamMember(member);
}

async function loadManageableMember(owner, memberId) {
  const member = await RecruiterProfile.findOne({
    where: { id: memberId, company_id: owner.company_id },
    include: [{ model: User, as: 'user' }],
  });

  if (!member) {
    throw ApiError.notFound('Membre introuvable.');
  }
  if (member.id === owner.id) {
    throw ApiError.forbidden('Vous ne pouvez pas modifier votre propre compte ici.');
  }
  return member;
}

async function assertAnotherOwnerRemains(owner, member) {
  if (member.company_role !== COMPANY_ROLES.OWNER) return;
  const others = await RecruiterProfile.count({
    where: {
      company_id: owner.company_id,
      company_role: COMPANY_ROLES.OWNER,
      id: { [Op.ne]: member.id },
    },
    include: [{ model: User, as: 'user', where: { is_banned: false }, required: true }],
  });
  if (others < 1) {
    throw ApiError.badRequest('L’entreprise doit garder au moins un administrateur actif.');
  }
}

async function revokeMemberAccess(user) {
  await user.update({
    session_version: Number(user.session_version || 0) + 1,
  });
  await RefreshSession.update(
    { revoked_at: new Date() },
    { where: { user_id: user.id, revoked_at: null } }
  );
}

async function stopTeamMember({ owner, memberId }) {
  const member = await loadManageableMember(owner, memberId);
  await assertAnotherOwnerRemains(owner, member);
  await member.user.update({
    is_banned: true,
    ban_reason: 'Compte arrêté par un administrateur de l’entreprise',
    banned_at: new Date(),
  });
  await revokeMemberAccess(member.user);
  await member.reload({
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_banned'] }],
  });
  return formatTeamMember(member);
}

async function reactivateTeamMember({ owner, memberId }) {
  const member = await loadManageableMember(owner, memberId);
  await member.user.update({
    is_banned: false,
    ban_reason: null,
    banned_at: null,
  });
  await member.reload({
    include: [{ model: User, as: 'user', attributes: ['id', 'email', 'is_banned'] }],
  });
  return formatTeamMember(member);
}

async function removeTeamMember({ owner, memberId }) {
  const member = await loadManageableMember(owner, memberId);
  await assertAnotherOwnerRemains(owner, member);

  const postedJobsCount = await Job.count({ where: { recruiter_id: member.id } });
  if (postedJobsCount > 0) {
    throw ApiError.badRequest(
      'Ce recruteur a publié des offres. Arrêtez son compte pour lui couper l’accès. L’historique des offres doit rester lié à ce compte.'
    );
  }

  const user = member.user;
  await member.destroy();
  if (user) {
    await user.update({
      is_banned: true,
      ban_reason: 'Compte supprimé par un administrateur de l’entreprise',
      banned_at: new Date(),
    });
    await revokeMemberAccess(user);
  }

  return { message: 'Compte recruteur supprimé.' };
}

module.exports = {
  listTeamMembers,
  inviteTeamMember,
  updateTeamMemberPermissions,
  stopTeamMember,
  reactivateTeamMember,
  removeTeamMember,
};
