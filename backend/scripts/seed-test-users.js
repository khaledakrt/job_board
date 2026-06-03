'use strict';

/**
 * Inserts verified test users (idempotent — skips if email exists).
 * Usage: npm run db:seed
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Op } = require('sequelize');
const {
  User,
  CandidateProfile,
  Company,
  RecruiterProfile,
  Subscription,
} = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { hashPassword } = require('../src/utils/password');
const { generateUuid } = require('../src/utils/uuid');
const { USER_ROLES, COMPANY_ROLES } = require('../src/config/constants');

const TEST_PASSWORD = 'Test1234!';

const TEST_USERS = [
  {
    email: 'candidate@test.com',
    role: USER_ROLES.CANDIDATE,
    profile: {
      first_name: 'Jean',
      last_name: 'Candidat',
      professional_title: 'Développeur Full Stack',
      phone: '+33600000001',
      skills: ['JavaScript', 'Angular', 'Node.js'],
    },
  },
  {
    email: 'recruiter@test.com',
    role: USER_ROLES.RECRUITER,
    company: {
      name: 'Acme Corp',
      industry: 'Technology',
      website: 'https://acme.example.com',
      description: 'Entreprise de test pour le recruteur.',
    },
    recruiter: {
      job_title: 'HR Manager',
      company_role: COMPANY_ROLES.OWNER,
      can_post_job: true,
      can_decide_application: true,
      can_edit_company: true,
    },
  },
];

async function upsertUser({ email, role }) {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    if (!existing.is_verified) {
      await existing.update({ is_verified: true, verification_token: null });
    }
    return { user: existing, created: false };
  }

  const passwordHash = await hashPassword(TEST_PASSWORD);
  const user = await User.create({
    id: generateUuid(),
    email,
    password_hash: passwordHash,
    role,
    is_verified: true,
    verification_token: null,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });

  return { user, created: true };
}

async function seedCandidate(user, data) {
  const [profile, created] = await CandidateProfile.findOrCreate({
    where: { user_id: user.id },
    defaults: {
      id: generateUuid(),
      user_id: user.id,
      first_name: data.first_name,
      last_name: data.last_name,
      professional_title: data.professional_title,
      phone: data.phone,
      skills: data.skills,
      updated_at: new Date(),
    },
  });

  return { profile, created };
}

async function seedRecruiter(user, { company: companyData, recruiter: recruiterData }) {
  let company = await Company.findOne({
    where: { name: companyData.name },
  });

  if (!company) {
    company = await Company.create({
      id: generateUuid(),
      name: companyData.name,
      industry: companyData.industry,
      website: companyData.website,
      description: companyData.description,
      created_at: new Date(),
    });
  }

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  await Subscription.findOrCreate({
    where: { company_id: company.id },
    defaults: {
      id: generateUuid(),
      company_id: company.id,
      plan_type: 'enterprise',
      status: 'active',
      current_period_end: periodEnd,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  const [profile, created] = await RecruiterProfile.findOrCreate({
    where: { user_id: user.id },
    defaults: {
      id: generateUuid(),
      user_id: user.id,
      company_id: company.id,
      job_title: recruiterData.job_title,
      company_role: recruiterData.company_role,
      can_post_job: recruiterData.can_post_job,
      can_decide_application: recruiterData.can_decide_application,
      can_edit_company: recruiterData.can_edit_company,
      updated_at: new Date(),
    },
  });

  return { company, profile, created };
}

async function main() {
  await connectDatabase();

  console.log('\n=== Test users (password for all: %s) ===\n', TEST_PASSWORD);

  for (const spec of TEST_USERS) {
    const { user, created: userCreated } = await upsertUser(spec);
    const action = userCreated ? 'created' : 'already exists';

    if (spec.role === USER_ROLES.CANDIDATE) {
      const { created } = await seedCandidate(user, spec.profile);
      console.log(`[candidate] ${spec.email} — user ${action}, profile ${created ? 'created' : 'ok'}`);
    } else {
      const { company, created } = await seedRecruiter(user, spec);
      console.log(
        `[recruiter] ${spec.email} — user ${action}, company "${company.name}", profile ${created ? 'created' : 'ok'}`
      );
    }
  }

  console.log('\nLogin at http://localhost:4200/auth/login\n');
  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seed failed:', err.message);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
