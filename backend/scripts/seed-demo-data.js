'use strict';

/**
 * Demo data: 3 recruiters, 3 candidates (password Test1234!), 10 active jobs.
 * Idempotent — skips existing emails / job titles per company.
 * Usage: npm run db:seed:demo
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  User,
  CandidateProfile,
  Company,
  RecruiterProfile,
  Subscription,
  Job,
} = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { hashPassword } = require('../src/utils/password');
const { generateUuid } = require('../src/utils/uuid');
const { USER_ROLES, COMPANY_ROLES, JOB_STATUS } = require('../src/config/constants');
const { defaultExpiresAt } = require('../src/utils/jobExpiration');

const TEST_PASSWORD = 'Test1234!';

const CANDIDATES = [
  {
    email: 'candidate1@test.com',
    profile: {
      first_name: 'Sophie',
      last_name: 'Martin',
      professional_title: 'Développeuse Frontend',
      phone: '+33601010101',
      skills: ['Angular', 'TypeScript', 'CSS', 'UX'],
    },
  },
  {
    email: 'candidate2@test.com',
    profile: {
      first_name: 'Karim',
      last_name: 'Benali',
      professional_title: 'Ingénieur DevOps',
      phone: '+33602020202',
      skills: ['AWS', 'Docker', 'Terraform', 'CI/CD'],
    },
  },
  {
    email: 'candidate3@test.com',
    profile: {
      first_name: 'Léa',
      last_name: 'Dupont',
      professional_title: 'Product Owner',
      phone: '+33603030303',
      skills: ['Agile', 'Scrum', 'SaaS', 'Roadmap'],
    },
  },
];

const RECRUITERS = [
  {
    email: 'recruiter1@test.com',
    company: {
      name: 'TechNova Solutions',
      industry: 'Technology',
      website: 'https://technova.example.com',
      description: 'Éditeur SaaS B2B spécialisé RH et recrutement.',
      city: 'Paris',
    },
    recruiter: {
      job_title: 'Directrice RH',
      company_role: COMPANY_ROLES.OWNER,
    },
    jobs: [
      {
        title: 'Développeur Full Stack Angular / Node.js (H/F)',
        location: 'Paris 9e',
        remote_type: 'hybrid',
        contract_type: 'CDI',
        salary_label: '45 000 – 55 000 € / an',
        experience_years: 3,
        tags: ['Angular', 'Node.js', 'TypeScript'],
        languages: ['Français', 'Anglais'],
        benefits: ['Télétravail', 'Tickets resto', 'Mutuelle'],
        description:
          'Rejoignez une équipe produit agile pour concevoir notre plateforme RH (Angular + Node.js).',
        requirements: '3+ ans Full Stack, Angular, Node.js, SQL.',
      },
      {
        title: 'Ingénieur DevOps Cloud AWS (H/F)',
        location: 'Lyon 3e',
        remote_type: 'remote',
        contract_type: 'CDI',
        salary_label: '50 000 – 65 000 € / an',
        experience_years: 5,
        tags: ['AWS', 'Terraform', 'Kubernetes'],
        languages: ['Français', 'Anglais'],
        benefits: ['100 % remote', 'Budget formation'],
        description: 'Pilotez notre infrastructure AWS et nos pipelines CI/CD.',
        requirements: '4+ ans DevOps, AWS, Terraform, Docker.',
      },
      {
        title: 'Product Owner SaaS B2B (H/F)',
        location: 'Paris 2e',
        remote_type: 'hybrid',
        contract_type: 'CDI',
        salary_label: '48 000 – 58 000 € / an',
        experience_years: 4,
        tags: ['Product Owner', 'Agile', 'SaaS'],
        languages: ['Français', 'Anglais'],
        benefits: ['RTT', 'Participation'],
        description: 'Portez la roadmap produit de notre ATS pour PME et ETI.',
        requirements: '3+ ans PO/PM sur produit B2B, Scrum, Jira.',
      },
      {
        title: 'Stagiaire Développement Web (H/F)',
        location: 'Paris 9e',
        remote_type: 'on-site',
        contract_type: 'Internship',
        salary_label: 'Gratification légale + tickets resto',
        experience_years: 0,
        tags: ['JavaScript', 'Stage', 'Web'],
        languages: ['Français'],
        benefits: ['Encadrement senior', 'Télétravail occasionnel'],
        description: 'Stage 6 mois au sein de l’équipe front pour contribuer à l’UI Angular.',
        requirements: 'Bac+3/4 informatique, bases JavaScript et Git.',
      },
    ],
  },
  {
    email: 'recruiter2@test.com',
    company: {
      name: 'GreenLogistics',
      industry: 'Logistics',
      website: 'https://greenlogistics.example.com',
      description: 'Logistique durable et supply chain pour e-commerce.',
      city: 'Marseille',
    },
    recruiter: {
      job_title: 'Responsable recrutement',
      company_role: COMPANY_ROLES.OWNER,
    },
    jobs: [
      {
        title: 'Responsable entrepôt (H/F)',
        location: 'Marseille',
        remote_type: 'on-site',
        contract_type: 'CDI',
        salary_label: '38 000 – 45 000 € / an',
        experience_years: 5,
        tags: ['Logistique', 'Management', 'WMS'],
        languages: ['Français'],
        benefits: ['Prime objectifs', 'Véhicule de fonction'],
        description: 'Managez une équipe de 25 personnes sur un site logistique régional.',
        requirements: '5+ ans en logistique, management d’équipe, WMS.',
      },
      {
        title: 'Chargé(e) de planning transport',
        location: 'Marseille',
        remote_type: 'hybrid',
        contract_type: 'CDD',
        salary_label: '32 000 – 38 000 € / an',
        experience_years: 2,
        tags: ['Transport', 'Planning', 'Excel'],
        languages: ['Français', 'Anglais'],
        benefits: ['Télétravail 1j/sem'],
        description: 'Optimisez les tournées et le suivi des livraisons nationales.',
        requirements: '2+ ans transport/logistique, Excel avancé.',
      },
      {
        title: 'Data Analyst Supply Chain (H/F)',
        location: 'Marseille',
        remote_type: 'hybrid',
        contract_type: 'CDI',
        salary_label: '42 000 – 50 000 € / an',
        experience_years: 3,
        tags: ['Python', 'SQL', 'Power BI'],
        languages: ['Français', 'Anglais'],
        benefits: ['Mutuelle famille', 'CE actif'],
        description: 'Analysez les flux stocks et proposez des optimisations data-driven.',
        requirements: 'SQL, Python ou R, dashboards (Power BI / Looker).',
      },
    ],
  },
  {
    email: 'recruiter3@test.com',
    company: {
      name: 'MediaPulse',
      industry: 'Media',
      website: 'https://mediapulse.example.com',
      description: 'Agence digitale — contenu, social media et campagnes.',
      city: 'Bordeaux',
    },
    recruiter: {
      job_title: 'Head of Talent',
      company_role: COMPANY_ROLES.OWNER,
    },
    jobs: [
      {
        title: 'Chef de projet digital (H/F)',
        location: 'Bordeaux',
        remote_type: 'hybrid',
        contract_type: 'CDI',
        salary_label: '40 000 – 48 000 € / an',
        experience_years: 4,
        tags: ['Digital', 'Gestion de projet', 'Client'],
        languages: ['Français', 'Anglais'],
        benefits: ['Remote 2j', 'Afterworks'],
        description: 'Pilotez des campagnes multi-canal pour des clients grands comptes.',
        requirements: '4+ ans agence ou annonceur, gestion de projet digital.',
      },
      {
        title: 'Social Media Manager (H/F)',
        location: 'Bordeaux',
        remote_type: 'remote',
        contract_type: 'CDI',
        salary_label: '35 000 – 42 000 € / an',
        experience_years: 2,
        tags: ['Social media', 'Content', 'Community'],
        languages: ['Français'],
        benefits: ['Télétravail', 'Matériel photo'],
        description: 'Animez les réseaux sociaux et la ligne éditoriale de nos marques.',
        requirements: '2+ ans social media, rédaction, outils planning.',
      },
      {
        title: 'Graphiste / Motion Designer freelance',
        location: 'Bordeaux',
        remote_type: 'remote',
        contract_type: 'Freelance',
        salary_label: 'TJM 350 – 450 €',
        experience_years: 3,
        tags: ['After Effects', 'Figma', 'Branding'],
        languages: ['Français'],
        benefits: ['Projets variés', 'Remote'],
        description: 'Création de visuels et motion pour campagnes digitales (mission 6 mois).',
        requirements: 'Portfolio solide, Figma, After Effects ou Premiere.',
      },
    ],
  },
];

async function upsertUser(email, role) {
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
  const [, created] = await CandidateProfile.findOrCreate({
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
  return created;
}

async function seedRecruiter(user, { company: companyData, recruiter: recruiterData }) {
  let company = await Company.findOne({ where: { name: companyData.name } });

  if (!company) {
    company = await Company.create({
      id: generateUuid(),
      name: companyData.name,
      industry: companyData.industry,
      website: companyData.website,
      description: companyData.description,
      city: companyData.city,
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
      can_post_job: true,
      can_decide_application: true,
      can_edit_company: true,
      updated_at: new Date(),
    },
  });

  if (!created) {
    await profile.update({
      company_id: company.id,
      can_post_job: true,
      can_decide_application: true,
      can_edit_company: true,
    });
  }

  return { company, profile };
}

async function seedJobsForCompany(company, recruiter, jobs) {
  let created = 0;
  let skipped = 0;

  for (const spec of jobs) {
    const existing = await Job.findOne({
      where: { company_id: company.id, title: spec.title },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await Job.create({
      id: generateUuid(),
      company_id: company.id,
      recruiter_id: recruiter.id,
      title: spec.title,
      description: spec.description,
      requirements: spec.requirements,
      tags: spec.tags,
      languages: spec.languages || null,
      benefits: spec.benefits || null,
      experience_years: spec.experience_years ?? null,
      location: spec.location,
      remote_type: spec.remote_type,
      contract_type: spec.contract_type,
      salary_label: spec.salary_label,
      status: JOB_STATUS.ACTIVE,
      expires_at: defaultExpiresAt(),
      views_count: Math.floor(Math.random() * 60) + 10,
      applications_count: 0,
      quiz_enabled: false,
      quiz_data: null,
      created_at: new Date(),
    });
    created += 1;
  }

  return { created, skipped };
}

async function main() {
  await connectDatabase();

  console.log('\n=== Demo seed (password: %s) ===\n', TEST_PASSWORD);

  console.log('--- Candidats ---');
  for (const spec of CANDIDATES) {
    const { user, created } = await upsertUser(spec.email, USER_ROLES.CANDIDATE);
    const profileCreated = await seedCandidate(user, spec.profile);
    console.log(
      `  ${spec.email} — user ${created ? 'créé' : 'existe'}, profil ${profileCreated ? 'créé' : 'ok'}`
    );
  }

  console.log('\n--- Recruteurs & offres ---');
  let totalJobsCreated = 0;
  let totalJobsSkipped = 0;

  for (const spec of RECRUITERS) {
    const { user, created } = await upsertUser(spec.email, USER_ROLES.RECRUITER);
    const { company, profile } = await seedRecruiter(user, spec);
    const { created: jc, skipped: js } = await seedJobsForCompany(company, profile, spec.jobs);

    totalJobsCreated += jc;
    totalJobsSkipped += js;

    console.log(
      `  ${spec.email} — ${company.name} — user ${created ? 'créé' : 'existe'}, ${jc} offre(s) créée(s), ${js} ignorée(s)`
    );
  }

  console.log('\n--- Résumé ---');
  console.log('  3 candidats : candidate1/2/3@test.com');
  console.log('  3 recruteurs : recruiter1/2/3@test.com');
  console.log(`  Offres : ${totalJobsCreated} créées, ${totalJobsSkipped} déjà présentes (total visé: 10 par entreprise)`);
  console.log('\n  Accueil public : http://localhost:4200/');
  console.log('  Connexion      : http://localhost:4200/auth/login\n');

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seed demo failed:', err.message);
  if (err.stack) console.error(err.stack);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
