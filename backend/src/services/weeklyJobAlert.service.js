'use strict';

const { Op, Sequelize } = require('sequelize');
const { JobAlert, CandidateProfile, User, Job, Company } = require('../models');
const { JOB_PUBLIC_STATUSES } = require('../config/constants');
const { env } = require('../config');
const { sendMail } = require('./email.service');
const { expireDueJobs } = require('../utils/jobExpiration');
const logger = require('../utils/logger');

const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailEnabled: true,
  jobAlert: true,
};

const MAX_JOBS_PER_ALERT = 10;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSameLocalDate(a, b) {
  return Boolean(a) && localDateKey(new Date(a)) === localDateKey(b);
}

function startOfLocalDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfLookback(alert) {
  if (alert.last_sent_at) return new Date(alert.last_sent_at);
  const d = new Date();
  if (alert.frequency === 'monthly') {
    d.setMonth(d.getMonth() - 1);
  } else {
    d.setDate(d.getDate() - 7);
  }
  return d;
}

function isAlertDue(alert, now) {
  if (alert.frequency === 'monthly') return now.getDate() === 1;
  return now.getDay() === 0;
}

function frequencyLabel(alert) {
  return alert.frequency === 'monthly' ? 'mensuelle' : 'hebdomadaire';
}

function notificationPreferences(candidate) {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...(candidate?.notification_preferences || {}),
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function addAnd(where, condition) {
  if (!where[Op.and]) where[Op.and] = [];
  where[Op.and].push(condition);
}

function buildJobWhere(filters, since) {
  const where = {
    status: { [Op.in]: [...JOB_PUBLIC_STATUSES] },
    created_at: { [Op.gte]: since },
  };

  const keywords = String(filters.keywords || '').trim();
  if (keywords) {
    const like = `%${keywords}%`;
    addAnd(where, {
      [Op.or]: [
        { title: { [Op.like]: like } },
        { description: { [Op.like]: like } },
        { requirements: { [Op.like]: like } },
        { location: { [Op.like]: like } },
        { salary_label: { [Op.like]: like } },
        Sequelize.literal(
          `CAST(COALESCE(tags, JSON_ARRAY()) AS CHAR) LIKE ${Job.sequelize.escape(like)}`
        ),
        Sequelize.literal(
          `CAST(COALESCE(languages, JSON_ARRAY()) AS CHAR) LIKE ${Job.sequelize.escape(like)}`
        ),
      ],
    });
  }

  const location = String(filters.location || '').trim();
  if (location) where.location = { [Op.like]: `%${location}%` };

  const contracts = normalizeArray(filters.contracts || filters.contractType);
  if (contracts.length) where.contract_type = { [Op.in]: contracts };

  const remotes = normalizeArray(filters.remotes || filters.remoteType);
  if (remotes.length) where.remote_type = { [Op.in]: remotes };

  if (filters.quizOnly) where.quiz_enabled = true;

  if (filters.experience === 'junior') where.experience_years = { [Op.lte]: 2 };
  if (filters.experience === 'mid') where.experience_years = { [Op.between]: [3, 5] };
  if (filters.experience === 'senior') where.experience_years = { [Op.gte]: 6 };

  if (filters.minSalary != null && Number(filters.minSalary) > 0) {
    const min = Math.floor(Number(filters.minSalary));
    addAnd(where, {
      [Op.or]: [
        { salary_max: { [Op.gte]: min } },
        {
          [Op.and]: [
            { salary_max: null },
            { salary_min: { [Op.gte]: min } },
          ],
        },
      ],
    });
  }

  return where;
}

function buildCompanyWhere(filters) {
  const where = {};
  const company = String(filters.company || '').trim();
  const industry = String(filters.industry || '').trim();

  if (company) where.name = { [Op.like]: `%${company}%` };
  if (industry) where.industry = { [Op.like]: `%${industry}%` };

  return where;
}

function formatFilterSummary(filters) {
  const parts = [];
  if (filters.keywords) parts.push(`Mots-clés: ${filters.keywords}`);
  if (filters.location) parts.push(`Lieu: ${filters.location}`);
  if (filters.company) parts.push(`Entreprise: ${filters.company}`);
  if (filters.industry) parts.push(`Secteur: ${filters.industry}`);
  if (normalizeArray(filters.contracts || filters.contractType).length) {
    parts.push(`Contrats: ${normalizeArray(filters.contracts || filters.contractType).join(', ')}`);
  }
  if (normalizeArray(filters.remotes || filters.remoteType).length) {
    parts.push(`Télétravail: ${normalizeArray(filters.remotes || filters.remoteType).join(', ')}`);
  }
  if (filters.experience && filters.experience !== 'all') parts.push(`Expérience: ${filters.experience}`);
  if (filters.quizOnly) parts.push('Quiz technique uniquement');
  return parts.length ? parts.join(' · ') : 'Toutes les offres';
}

async function findMatchingJobs(alert) {
  const filters = alert.search_filters || {};
  const since = startOfLookback(alert);
  const companyWhere = buildCompanyWhere(filters);

  return Job.findAll({
    where: buildJobWhere(filters, since),
    include: [
      {
        model: Company,
        as: 'company',
        attributes: ['id', 'name', 'industry'],
        where: Object.keys(companyWhere).length ? companyWhere : undefined,
        required: Object.keys(companyWhere).length > 0,
      },
    ],
    order: [['created_at', 'DESC']],
    limit: MAX_JOBS_PER_ALERT,
  });
}

async function claimAlertForToday(alert, now) {
  const [updated] = await JobAlert.update(
    { last_sent_at: now, updated_at: new Date() },
    {
      where: {
        id: alert.id,
        [Op.or]: [
          { last_sent_at: null },
          { last_sent_at: { [Op.lt]: startOfLocalDay(now) } },
        ],
      },
    }
  );
  return updated === 1;
}

async function releaseAlertClaim(alert, previousLastSentAt) {
  await JobAlert.update(
    { last_sent_at: previousLastSentAt || null, updated_at: new Date() },
    { where: { id: alert.id } }
  );
  alert.last_sent_at = previousLastSentAt || null;
}

function buildEmail({ candidateName, alert, jobs }) {
  const frequency = frequencyLabel(alert);
  const title = alert.label || `Votre alerte emploi ${frequency}`;
  const filters = formatFilterSummary(alert.search_filters || {});
  const jobsText = jobs
    .map((job) => {
      const url = `${env.CLIENT_URL.replace(/\/$/, '')}/offres/${job.id}`;
      return `- ${job.title} chez ${job.company?.name || 'Entreprise'} (${job.location || 'Lieu flexible'})\n  ${url}`;
    })
    .join('\n');

  const jobsHtml = jobs
    .map((job) => {
      const url = `${env.CLIENT_URL.replace(/\/$/, '')}/offres/${job.id}`;
      return `
        <li style="margin-bottom:14px;">
          <a href="${escapeHtml(url)}" style="font-weight:700;color:#0a66c2;text-decoration:none;">${escapeHtml(job.title)}</a>
          <div style="font-size:13px;color:#4b5563;margin-top:3px;">
            ${escapeHtml(job.company?.name || 'Entreprise')} · ${escapeHtml(job.location || 'Lieu flexible')} · ${escapeHtml(job.contract_type)}
          </div>
        </li>`;
    })
    .join('');

  return {
    subject: `Nouvelles offres pour vous — ${title}`,
    text:
      `Bonjour ${candidateName},\n\n` +
      `Voici les nouvelles offres correspondant à votre alerte ${frequency} "${title}".\n` +
      `Critères: ${filters}\n\n` +
      `${jobsText}\n\n` +
      `Vous recevez cet e-mail car l'option "Alertes emploi" est activée dans vos paramètres.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;">
        <h2 style="margin:0 0 8px;">${escapeHtml(title)}</h2>
        <p>Bonjour ${escapeHtml(candidateName)}, voici les nouvelles offres correspondant à votre alerte ${escapeHtml(frequency)}.</p>
        <p style="font-size:13px;color:#6b7280;"><strong>Critères :</strong> ${escapeHtml(filters)}</p>
        <ul style="padding-left:20px;margin-top:18px;">${jobsHtml}</ul>
        <p style="font-size:13px;color:#6b7280;margin-top:18px;">
          Vous recevez cet e-mail car l'option "Alertes emploi" est activée dans vos paramètres.
        </p>
      </div>`,
  };
}

async function sendWeeklyJobAlerts({ now = new Date(), force = false } = {}) {
  await expireDueJobs({}, { force: true });

  const alerts = await JobAlert.findAll({
    where: {
      is_active: true,
      frequency: { [Op.in]: ['weekly', 'monthly'] },
    },
    include: [
      {
        model: CandidateProfile,
        as: 'candidate',
        required: true,
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }],
      },
    ],
    order: [['created_at', 'ASC']],
  });

  let sent = 0;
  let skipped = 0;

  for (const alert of alerts) {
    try {
      if (!force && !isAlertDue(alert, now)) {
        skipped += 1;
        continue;
      }

      if (!force && isSameLocalDate(alert.last_sent_at, now)) {
        skipped += 1;
        continue;
      }

      const prefs = notificationPreferences(alert.candidate);
      if (prefs.jobAlert === false || prefs.emailEnabled === false || !alert.candidate?.user?.email) {
        skipped += 1;
        continue;
      }

      const previousLastSentAt = alert.last_sent_at;
      let claimed = false;

      if (!force) {
        const claimSucceeded = await claimAlertForToday(alert, now);
        if (!claimSucceeded) {
          skipped += 1;
          continue;
        }
        claimed = true;
        alert.last_sent_at = now;
      }

      const jobs = await findMatchingJobs(alert);
      if (!jobs.length) {
        if (claimed) {
          await releaseAlertClaim(alert, previousLastSentAt);
        }
        skipped += 1;
        continue;
      }

      const candidateName =
        [alert.candidate.first_name, alert.candidate.last_name].filter(Boolean).join(' ') ||
        alert.candidate.user.email;
      const email = buildEmail({ candidateName, alert, jobs });

      const mailResult = await sendMail({
        to: alert.candidate.user.email,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      if (!mailResult.sent) {
        if (claimed) {
          await releaseAlertClaim(alert, previousLastSentAt);
        }
        skipped += 1;
        continue;
      }

      if (force) {
        await alert.update({ last_sent_at: now, updated_at: new Date() });
      }
      sent += 1;
    } catch (error) {
      skipped += 1;
      logger.error(`[WeeklyJobAlerts] Failed alert ${alert.id}`, error);
    }
  }

  logger.info(`[WeeklyJobAlerts] processed=${alerts.length} sent=${sent} skipped=${skipped}`);
  return { processed: alerts.length, sent, skipped };
}

function startWeeklyJobAlertScheduler() {
  const run = () => {
    sendWeeklyJobAlerts().catch((error) => logger.error('[WeeklyJobAlerts] Scheduler failed', error));
  };

  run();
  const interval = setInterval(run, 60 * 60 * 1000);
  return () => clearInterval(interval);
}

module.exports = {
  sendWeeklyJobAlerts,
  startWeeklyJobAlertScheduler,
};
