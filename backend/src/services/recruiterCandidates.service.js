'use strict';

const { Op } = require('sequelize');
const sequelize = require('../database/sequelize');
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

function plainLabels(value) {
  return asLabels(value).map((label) => label.split(' · ')[0]).filter(Boolean);
}

function asExperiences(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item) => ({
    title: item?.title || '',
    company: item?.company || '',
    city: item?.city || '',
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
    city: item?.city || '',
  })).filter((item) => item.institution || item.degree);
}

function locationsOf(profile) {
  const prefs = profile.job_preferences || {};
  const preferred = Array.isArray(prefs.preferredLocations) ? prefs.preferredLocations : [];
  const cities = [
    ...(Array.isArray(profile.experiences) ? profile.experiences.map((item) => item?.city) : []),
    ...(Array.isArray(profile.education) ? profile.education.map((item) => item?.city) : []),
  ];
  return [...preferred, ...cities].map((item) => String(item || '').trim()).filter(Boolean);
}

function formatCandidate(profile) {
  const user = profile.user;
  const prefs = profile.job_preferences || {};
  const locations = locationsOf(profile);
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
    locations,
    location: locations[0] || null,
    contractTypes: plainLabels(prefs.contractTypes),
    linkedinUrl: profile.linkedin_url,
    portfolioUrl: profile.portfolio_url,
    resumeUrl: profile.resume_url,
    avatarUrl: profile.avatar_url,
    createdAt: user?.created_at || null,
  };
}

function jsonMatch(column, path, term) {
  const safe = String(term).replace(/[%_\\]/g, '').slice(0, 80);
  return sequelize.literal(
    `JSON_SEARCH(\`${column}\`, 'one', ${sequelize.escape(`%${safe}%`)}, NULL, ${sequelize.escape(path)}) IS NOT NULL`
  );
}

async function listCandidates(query) {
  const { page, limit, offset } = parsePagination({
    page: query.page,
    limit: Math.min(10, Number(query.limit) || 10),
  });
  const term = String(query.search || '').trim().slice(0, 120);
  const country = String(query.country || '').trim();
  const skill = String(query.skill || '').trim();
  const language = String(query.language || '').trim();
  const title = String(query.title || '').trim();
  const contract = String(query.contract || '').trim();
  const and = [];

  if (term) {
    const like = `%${term.replace(/[%_]/g, '')}%`;
    and.push({
      [Op.or]: [
        { first_name: { [Op.like]: like } },
        { last_name: { [Op.like]: like } },
        { professional_title: { [Op.like]: like } },
        { phone: { [Op.like]: like } },
        { '$user.email$': { [Op.like]: like } },
      ],
    });
  }
  if (country) {
    and.push({
      [Op.or]: [
        jsonMatch('job_preferences', '$.preferredLocations', country),
        jsonMatch('experiences', '$[*].city', country),
        jsonMatch('education', '$[*].city', country),
      ],
    });
  }
  if (skill) and.push(jsonMatch('skills', '$[*]', skill));
  if (language) and.push(jsonMatch('languages', '$[*]', language));
  if (title) {
    const like = `%${title.replace(/[%_]/g, '')}%`;
    and.push({ professional_title: { [Op.like]: like } });
  }
  if (contract) and.push(jsonMatch('job_preferences', '$.contractTypes', contract));

  const result = await CandidateProfile.findAndCountAll({
    where: and.length ? { [Op.and]: and } : {},
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

  const pageResult = buildPaginatedResponse({
    rows: result.rows.map(formatCandidate),
    count: result.count,
    page,
    limit,
  });
  return pageResult;
}

module.exports = {
  listCandidates,
};
