'use strict';

const { Op } = require('sequelize');
const { Application, Job, Company, CandidateProfile } = require('../models');
const { JOB_PUBLIC_STATUSES } = require('../config/constants');
const { expireDueJobs } = require('../utils/jobExpiration');
const publicJobSearchService = require('./publicJobSearch.service');

const ARCHIVE_MONTHS = 6;

function monthsAgo(months) {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

function isArchivedApplication(app) {
  if (app.status !== 'rejected') return false;
  return new Date(app.updated_at) < monthsAgo(ARCHIVE_MONTHS);
}

function scoreJobForCandidate(job, profile) {
  let score = 0;
  const skills = (profile.skills || []).map((s) => String(s).toLowerCase());
  const title = (profile.professional_title || '').toLowerCase();
  const hay = `${job.title} ${job.description || ''} ${job.requirements || ''}`.toLowerCase();

  for (const skill of skills) {
    if (skill && hay.includes(skill)) score += 3;
  }
  if (title && hay.includes(title.split(' ')[0])) score += 2;

  const prefs = profile.job_preferences || {};
  if (prefs.contractTypes?.length && prefs.contractTypes.includes(job.contract_type)) {
    score += 2;
  }
  if (prefs.remoteTypes?.length && prefs.remoteTypes.includes(job.remote_type)) {
    score += 2;
  }
  if (profile.min_salary && job.salary_label) {
    const nums = String(job.salary_label).match(/\d[\d\s]*/g);
    if (nums?.length) {
      const val = parseInt(nums[0].replace(/\s/g, ''), 10);
      if (!Number.isNaN(val) && val >= Number(profile.min_salary)) score += 1;
    }
  }

  return score;
}

async function getDashboardSummary(candidateId) {
  const applications = await Application.findAll({
    where: { candidate_id: candidateId },
    attributes: ['id', 'status', 'created_at', 'updated_at'],
    order: [['created_at', 'ASC']],
  });

  const active = [];
  const archived = [];

  for (const app of applications) {
    if (isArchivedApplication(app)) archived.push(app);
    else active.push(app);
  }

  const respondedStatuses = ['screening', 'interview', 'offer', 'rejected'];
  const responded = applications.filter((a) => respondedStatuses.includes(a.status)).length;
  const responseRate =
    applications.length > 0 ? Math.round((responded / applications.length) * 100) : 0;

  const monthlyMap = new Map();
  for (const app of applications) {
    const d = new Date(app.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
  }

  const monthlyApplications = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([month, count]) => ({ month, count }));

  return {
    totals: {
      applications: applications.length,
      active: active.length,
      archived: archived.length,
      interview: applications.filter((a) => a.status === 'interview').length,
      offer: applications.filter((a) => a.status === 'offer').length,
    },
    responseRate,
    monthlyApplications,
  };
}

async function getRecommendedJobs(candidateId, limit = 6) {
  const profile = await CandidateProfile.findByPk(candidateId);
  if (!profile) return [];

  await expireDueJobs();

  const { rows } = await Job.findAndCountAll({
    where: { status: { [Op.in]: [...JOB_PUBLIC_STATUSES] } },
    include: [{ model: Company, as: 'company', attributes: ['id', 'name', 'logo_url', 'industry'] }],
    order: [['created_at', 'DESC']],
    limit: 80,
  });

  const applied = await Application.findAll({
    where: { candidate_id: candidateId },
    attributes: ['job_id'],
  });
  const appliedSet = new Set(applied.map((a) => a.job_id));

  const scored = rows
    .filter((j) => !appliedSet.has(j.id))
    .map((job) => ({
      job: publicJobSearchService.formatPublicJob(job),
      score: scoreJobForCandidate(job, profile),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((x) => ({ ...x.job, matchScore: x.score }));
}

function formatRecruiterPreview(profile) {
  const completion = computeCompletion(profile);
  const tips = buildCompletionTips(profile, completion);

  return {
    profile: {
      firstName: profile.first_name,
      lastName: profile.last_name,
      professionalTitle: profile.professional_title,
      bio: profile.bio,
      phone: profile.phone,
      avatarUrl: profile.avatar_url,
      skills: profile.skills,
      experiences: profile.experiences,
      education: profile.education,
      languages: profile.languages,
      certifications: profile.certifications,
      linkedinUrl: profile.linkedin_url,
      portfolioUrl: profile.portfolio_url,
      resumeUrl: profile.resume_url,
      minSalary: profile.min_salary,
      jobPreferences: profile.job_preferences,
    },
    completionPercent: completion,
    tips,
  };
}

function computeCompletion(profile) {
  const checks = [
    Boolean(profile.first_name?.trim()),
    Boolean(profile.last_name?.trim()),
    Boolean(profile.professional_title?.trim()),
    Boolean(profile.phone?.trim()),
    Boolean(profile.bio?.trim()),
    Boolean(profile.resume_url),
    Boolean(profile.avatar_url),
    (profile.skills?.length ?? 0) > 0,
    (profile.experiences?.length ?? 0) > 0,
    (profile.education?.length ?? 0) > 0,
    (profile.languages?.length ?? 0) > 0,
    Boolean(profile.linkedin_url?.trim()),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function buildCompletionTips(profile, percent) {
  const tips = [];
  if (!profile.resume_url) tips.push({ id: 'resume', text: 'Ajoutez un CV PDF pour pouvoir postuler.' });
  if (!profile.avatar_url) tips.push({ id: 'avatar', text: 'Une photo de profil inspire confiance.' });
  if (!(profile.skills?.length)) tips.push({ id: 'skills', text: 'Listez au moins 5 compétences clés.' });
  if (!(profile.experiences?.length)) tips.push({ id: 'exp', text: 'Détaillez vos expériences professionnelles.' });
  if (!profile.bio?.trim()) tips.push({ id: 'bio', text: 'Rédigez une courte bio (2–3 phrases).' });
  if (!(profile.languages?.length)) tips.push({ id: 'lang', text: 'Indiquez les langues que vous parlez.' });
  if (!profile.linkedin_url?.trim()) tips.push({ id: 'linkedin', text: 'Ajoutez votre profil LinkedIn.' });
  if (percent >= 90) tips.push({ id: 'done', text: 'Excellent profil — vous maximisez vos chances !' });
  return tips.slice(0, 5);
}

module.exports = {
  getDashboardSummary,
  getRecommendedJobs,
  formatRecruiterPreview,
  isArchivedApplication,
  ARCHIVE_MONTHS,
};
