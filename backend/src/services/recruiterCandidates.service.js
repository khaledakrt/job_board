'use strict';

const { Op } = require('sequelize');
const { CandidateProfile, User } = require('../models');
const { USER_ROLES } = require('../config/constants');
const { parsePagination, buildPaginatedResponse } = require('../utils/pagination');

function asLabels(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (!item || typeof item !== 'object') return '';
      const name = item.name || item.label || item.language || item.title || '';
      const level = item.level || '';
      return [name, level].filter(Boolean).join(' · ');
    })
    .filter(Boolean)
    .slice(0, 20);
}

function asExperiences(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => ({
    title: item?.title || '',
    company: item?.company || '',
    startDate: item?.startDate || '',
    endDate: item?.endDate || '',
    current: Boolean(item?.current),
  })).filter((item) => item.title || item.company);
}

function asEducation(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 6).map((item) => ({
    institution: item?.institution || '',
    degree: item?.degree || '',
  })).filter((item) => item.institution || item.degree);
}

function formatCandidate(profile) {
  const user = profile.user;
  return {
    id: profile.id,
    userId: profile.user_id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    email: user?.email || null,
    phone: profile.phone,
    professionalTitle: profile.professional_title,
    bio: profile.bio,
    skills: asLabels(profile.skills),
    languages: asLabels(profile.languages),
    experiences: asExperiences(profile.experiences),
    education: asEducation(profile.education),
    linkedinUrl: profile.linkedin_url,
    portfolioUrl: profile.portfolio_url,
    resumeUrl: profile.resume_url,
    avatarUrl: profile.avatar_url,
    createdAt: user?.created_at || null,
  };
}

async function listCandidates(query) {
  const { page, limit, offset } = parsePagination({
    page: query.page,
    limit: Math.min(10, Number(query.limit) || 10),
  });
  const term = String(query.search || '').trim().slice(0, 120);
  const where = {};

  if (term) {
    const like = `%${term.replace(/[%_]/g, '')}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: like } },
      { last_name: { [Op.like]: like } },
      { professional_title: { [Op.like]: like } },
      { phone: { [Op.like]: like } },
      { '$user.email$': { [Op.like]: like } },
    ];
  }

  const result = await CandidateProfile.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'email', 'created_at'],
        where: { role: USER_ROLES.CANDIDATE, is_banned: false },
        required: true,
      },
    ],
    order: [[{ model: User, as: 'user' }, 'created_at', 'DESC']],
    limit,
    offset,
    distinct: true,
    subQuery: false,
  });

  return buildPaginatedResponse({
    rows: result.rows.map(formatCandidate),
    count: result.count,
    page,
    limit,
  });
}

module.exports = {
  listCandidates,
};
