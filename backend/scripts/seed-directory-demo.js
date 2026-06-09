'use strict';

/**
 * Inserts directory demo data:
 * - 2 companies with active job offers
 * - 2 training centers with courses, formations and events
 * - 2 private institutions with published offerings
 *
 * Idempotent: existing records are updated/completed by email/name/title.
 * Usage: npm run db:seed:directories
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  User,
  Company,
  RecruiterProfile,
  Subscription,
  Job,
  TrainingCenter,
  TrainingCourse,
  TrainingFormation,
  TrainingEvent,
  PrivateInstitution,
  InstitutionOffering,
} = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { hashPassword } = require('../src/utils/password');
const { generateUuid } = require('../src/utils/uuid');
const {
  USER_ROLES,
  COMPANY_ROLES,
  JOB_STATUS,
  CATALOG_PUBLISH_STATUS,
} = require('../src/config/constants');
const { defaultExpiresAt } = require('../src/utils/jobExpiration');

const TEST_PASSWORD = 'Test1234!';

const COMPANIES = [
  {
    email: 'recrutement.smartdigital@test.com',
    recruiterJobTitle: 'Responsable recrutement',
    company: {
      name: 'Smart Digital Tunisia',
      industry: 'Informatique & services digitaux',
      city: 'Tunis',
      website: 'https://smartdigital.example.com',
      description:
        'Agence digitale tunisienne spécialisée en plateformes web, e-commerce et automatisation métier.',
      contact_email: 'contact@smartdigital.example.com',
      contact_phone: '+216 71 123 456',
    },
    jobs: [
      {
        title: 'Développeur Angular / Node.js',
        location: 'Tunis',
        remote_type: 'hybrid',
        contract_type: 'CDI',
        salary_label: '2 200 - 3 200 TND / mois',
        experience_years: 2,
        tags: ['Angular', 'Node.js', 'MySQL'],
        languages: ['Français', 'Anglais'],
        benefits: ['Télétravail partiel', 'Budget formation', 'Prime projet'],
        description:
          'Vous développez des interfaces Angular et des APIs Node.js pour des clients PME et grands comptes.',
        requirements:
          'Expérience Angular, TypeScript, REST API, SQL. Bon esprit produit et autonomie attendus.',
      },
      {
        title: 'UX/UI Designer web & mobile',
        location: 'Tunis',
        remote_type: 'hybrid',
        contract_type: 'CDD',
        salary_label: '1 800 - 2 600 TND / mois',
        experience_years: 3,
        tags: ['Figma', 'Design system', 'UX research'],
        languages: ['Français'],
        benefits: ['Projets variés', 'Horaires flexibles'],
        description:
          'Vous concevez des parcours utilisateurs, prototypes Figma et maquettes responsives pour applications web.',
        requirements:
          'Portfolio obligatoire, maîtrise Figma, sens UI, capacité à collaborer avec les développeurs.',
      },
    ],
  },
  {
    email: 'rh.mediterraneetrade@test.com',
    recruiterJobTitle: 'HR Business Partner',
    company: {
      name: 'Mediterranee Trade Services',
      industry: 'Commerce & distribution',
      city: 'Sfax',
      website: 'https://medtrade.example.com',
      description:
        'Entreprise de distribution B2B opérant sur les produits industriels et les services export.',
      contact_email: 'rh@medtrade.example.com',
      contact_phone: '+216 74 456 789',
    },
    jobs: [
      {
        title: 'Commercial B2B terrain',
        location: 'Sfax',
        remote_type: 'on-site',
        contract_type: 'CDI',
        salary_label: 'Fixe + commissions',
        experience_years: 2,
        tags: ['Vente B2B', 'Prospection', 'CRM'],
        languages: ['Français', 'Arabe'],
        benefits: ['Commissions', 'Téléphone pro', 'Frais de déplacement'],
        description:
          'Vous développez un portefeuille clients B2B sur Sfax et les régions voisines.',
        requirements:
          'Expérience commerciale terrain, permis B, bonne capacité de négociation et suivi client.',
      },
      {
        title: 'Assistant logistique export',
        location: 'Sfax',
        remote_type: 'on-site',
        contract_type: 'CDD',
        salary_label: '1 400 - 1 900 TND / mois',
        experience_years: 1,
        tags: ['Logistique', 'Export', 'Excel'],
        languages: ['Français', 'Anglais'],
        benefits: ['Formation interne', 'Prime performance'],
        description:
          'Vous assurez le suivi documentaire, la coordination transport et les tableaux de bord export.',
        requirements:
          'Bases logistique/export, Excel, sens de l’organisation et communication professionnelle.',
      },
    ],
  },
];

const TRAINING_CENTERS = [
  {
    email: 'contact.codeacademy.tn@test.com',
    center: {
      name: 'Code Academy Tunis',
      city: 'Tunis',
      training_domain: 'Informatique & digital',
      delivery_mode: 'hybrid',
      short_description:
        'Centre de formation spécialisé en développement web, data et compétences digitales.',
      description:
        '<p>Code Academy Tunis accompagne les étudiants et professionnels vers les métiers du numérique avec des parcours pratiques.</p>',
      address: 'Lac 2, Tunis',
      phone: '+216 71 888 100',
      email: 'contact@codeacademy.example.com',
      website: 'https://codeacademy.example.com',
    },
    courses: [
      {
        title: 'Bases JavaScript',
        description: 'Fondamentaux JS, DOM, API et bonnes pratiques.',
        delivery_mode: 'hybrid',
      },
      {
        title: 'Angular avancé',
        description: 'Standalone components, signals, routing et architecture front.',
        delivery_mode: 'online',
      },
    ],
    formations: [
      {
        title: 'Bootcamp Full Stack Angular / Node.js',
        category: 'Développement web',
        short_description: 'Parcours intensif pour construire une application complète.',
        description:
          '<p>12 semaines de pratique : Angular, Node.js, Express, MySQL, Git et déploiement.</p>',
        duration_label: '12 semaines',
        city: 'Tunis',
        delivery_mode: 'hybrid',
        price: 2400,
        certificate_delivered: true,
        seats: 18,
      },
    ],
    events: [
      {
        title: 'Atelier découverte Angular',
        event_type: 'workshop',
        description:
          '<p>Atelier gratuit pour découvrir les bases Angular et créer une première interface.</p>',
        city: 'Tunis',
        start_time: '10:00',
        end_time: '13:00',
        price: 0,
        seats: 30,
      },
    ],
  },
  {
    email: 'admin.skillsplus.sousse@test.com',
    center: {
      name: 'Skills Plus Sousse',
      city: 'Sousse',
      training_domain: 'Langues, management & marketing',
      delivery_mode: 'onsite',
      short_description:
        'Centre de formation professionnelle pour langues, soft skills, management et marketing.',
      description:
        '<p>Skills Plus propose des formations courtes et certifiantes orientées employabilité.</p>',
      address: 'Avenue Yasser Arafat, Sousse',
      phone: '+216 73 555 200',
      email: 'contact@skillsplus.example.com',
      website: 'https://skillsplus.example.com',
    },
    courses: [
      {
        title: 'Anglais professionnel',
        description: 'Communication écrite et orale pour le travail.',
        delivery_mode: 'onsite',
      },
      {
        title: 'Marketing digital',
        description: 'SEO, réseaux sociaux, campagnes Meta et Google.',
        delivery_mode: 'hybrid',
      },
    ],
    formations: [
      {
        title: 'Marketing digital pour PME',
        category: 'Marketing',
        short_description: 'Créer et piloter une stratégie digitale efficace.',
        description:
          '<p>Formation pratique : contenu, publicité, analytics et calendrier éditorial.</p>',
        duration_label: '6 semaines',
        city: 'Sousse',
        delivery_mode: 'onsite',
        price: 850,
        certificate_delivered: true,
        seats: 20,
      },
    ],
    events: [
      {
        title: 'Webinaire CV et entretien',
        event_type: 'webinar',
        description:
          '<p>Conseils pratiques pour améliorer son CV et réussir les entretiens d’embauche.</p>',
        city: 'En ligne',
        start_time: '18:00',
        end_time: '19:30',
        price: 0,
        seats: 100,
      },
    ],
  },
];

const INSTITUTIONS = [
  {
    email: 'admission.horizon.tunis@test.com',
    institution: {
      name: 'Institut Prive Horizon Tunis',
      institution_type: 'higher_institute',
      city: 'Tunis',
      short_description:
        'Institut supérieur privé proposant des parcours en informatique, gestion et business.',
      description:
        '<p>Institut Prive Horizon Tunis accompagne les étudiants avec des programmes professionnalisants et des stages.</p>',
      address: 'Avenue Mohamed V, Tunis',
      phone: '+216 71 222 300',
      email: 'admission@horizon.example.com',
      website: 'https://horizon.example.com',
      programs_json: [
        { title: 'Licence informatique appliquée', description: 'Développement logiciel et web.' },
        { title: 'Bachelor business digital', description: 'Marketing, gestion et innovation.' },
      ],
    },
    offerings: [
      {
        offering_type: 'program',
        title: 'Licence informatique appliquée',
        summary: 'Parcours orienté développement web, bases de données et projets applicatifs.',
        description:
          '<p>Programme sur 3 ans avec projets pratiques, stages et accompagnement carrière.</p>',
        category: 'Informatique',
        city: 'Tunis',
        seats: 45,
        status: 'published',
      },
      {
        offering_type: 'event',
        title: 'Journee portes ouvertes Horizon',
        summary: 'Rencontre avec les enseignants, visite du campus et présentation des filières.',
        description:
          '<p>Session d’information pour les nouveaux bacheliers et leurs familles.</p>',
        category: 'Admission',
        event_type: 'open_day',
        city: 'Tunis',
        seats: 120,
        status: 'published',
      },
    ],
  },
  {
    email: 'contact.carthagebusiness@test.com',
    institution: {
      name: 'Carthage Business School',
      institution_type: 'university',
      city: 'Ariana',
      short_description:
        'École privée spécialisée en management, finance, commerce international et entrepreneuriat.',
      description:
        '<p>Carthage Business School propose des formations orientées marché et un réseau d’entreprises partenaires.</p>',
      address: 'Technopole El Ghazala, Ariana',
      phone: '+216 70 111 400',
      email: 'contact@carthagebusiness.example.com',
      website: 'https://carthagebusiness.example.com',
      programs_json: [
        { title: 'Bachelor management', description: 'Gestion, leadership et stratégie.' },
        { title: 'Master finance digitale', description: 'Finance, data et outils numériques.' },
      ],
    },
    offerings: [
      {
        offering_type: 'announcement',
        title: 'Ouverture des inscriptions 2026',
        summary: 'Les candidatures sont ouvertes pour les bachelors et masters professionnels.',
        description:
          '<p>Les candidats peuvent déposer leur dossier en ligne ou prendre rendez-vous avec le service admission.</p>',
        category: 'Admissions',
        city: 'Ariana',
        status: 'published',
      },
      {
        offering_type: 'opportunity',
        title: 'Stage assistant marketing campus',
        summary: 'Stage étudiant en communication digitale et organisation d’événements campus.',
        description:
          '<p>Missions : animation réseaux sociaux, support événements, création de contenus et reporting.</p>',
        category: 'Marketing',
        opportunity_type: 'internship',
        city: 'Ariana',
        seats: 2,
        status: 'published',
      },
    ],
  },
];

function addMonths(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

async function ensureUser(email, role) {
  let user = await User.findOne({ where: { email } });
  if (user) {
    await user.update({
      role,
      is_verified: true,
      is_banned: false,
      verification_token: null,
      reset_token: null,
      reset_expires: null,
    });
    return { user, created: false };
  }

  user = await User.create({
    id: generateUuid(),
    email,
    password_hash: await hashPassword(TEST_PASSWORD),
    role,
    is_verified: true,
    is_banned: false,
    verification_token: null,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });
  return { user, created: true };
}

async function ensureCompanyAndRecruiter(spec) {
  const { user, created: userCreated } = await ensureUser(spec.email, USER_ROLES.RECRUITER);
  let company = await Company.findOne({ where: { name: spec.company.name } });

  const companyPayload = {
    ...spec.company,
    contact_email_public: true,
    contact_phone_public: true,
    country: 'Tunisie',
  };

  if (company) {
    await company.update(companyPayload);
  } else {
    company = await Company.create({
      id: generateUuid(),
      ...companyPayload,
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

  const [recruiter] = await RecruiterProfile.findOrCreate({
    where: { user_id: user.id },
    defaults: {
      id: generateUuid(),
      user_id: user.id,
      company_id: company.id,
      job_title: spec.recruiterJobTitle,
      company_role: COMPANY_ROLES.OWNER,
      can_post_job: true,
      can_decide_application: true,
      can_edit_company: true,
      updated_at: new Date(),
    },
  });

  await recruiter.update({
    company_id: company.id,
    job_title: spec.recruiterJobTitle,
    company_role: COMPANY_ROLES.OWNER,
    can_post_job: true,
    can_decide_application: true,
    can_edit_company: true,
  });

  return { company, recruiter, userCreated };
}

async function seedJobs(company, recruiter, jobs) {
  let created = 0;
  let updated = 0;

  for (const job of jobs) {
    const existing = await Job.findOne({
      where: { company_id: company.id, title: job.title },
    });
    const payload = {
      ...job,
      company_id: company.id,
      recruiter_id: recruiter.id,
      status: JOB_STATUS.ACTIVE,
      expires_at: defaultExpiresAt(),
      quiz_enabled: false,
      quiz_data: null,
      applications_count: existing?.applications_count ?? 0,
      views_count: existing?.views_count ?? 0,
    };

    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await Job.create({
        id: generateUuid(),
        ...payload,
        created_at: new Date(),
      });
      created += 1;
    }
  }

  return { created, updated };
}

async function ensureTrainingCenter(spec) {
  const { user, created: userCreated } = await ensureUser(
    spec.email,
    USER_ROLES.TRAINING_PROVIDER
  );
  let center = await TrainingCenter.findOne({ where: { name: spec.center.name } });

  const payload = {
    user_id: user.id,
    ...spec.center,
    photos_json: [],
    social_links_json: [],
    brochures_json: [],
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    updated_at: new Date(),
  };

  if (center) {
    await center.update(payload);
  } else {
    center = await TrainingCenter.create({
      id: generateUuid(),
      ...payload,
      created_at: new Date(),
    });
  }

  return { center, userCreated };
}

async function seedTrainingContent(center, spec) {
  let created = 0;
  let updated = 0;

  for (const course of spec.courses) {
    const existing = await TrainingCourse.findOne({
      where: { center_id: center.id, title: course.title },
    });
    const payload = {
      ...course,
      center_id: center.id,
      status: 'published',
      updated_at: new Date(),
    };
    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await TrainingCourse.create({
        id: generateUuid(),
        ...payload,
        created_at: new Date(),
      });
      created += 1;
    }
  }

  for (const formation of spec.formations) {
    const existing = await TrainingFormation.findOne({
      where: { center_id: center.id, title: formation.title },
    });
    const payload = {
      ...formation,
      center_id: center.id,
      start_date: addMonths(1),
      end_date: addMonths(3),
      address: center.address,
      phone: center.phone,
      email: center.email,
      website: center.website,
      gallery_json: [],
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      updated_at: new Date(),
    };
    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await TrainingFormation.create({
        id: generateUuid(),
        ...payload,
        created_at: new Date(),
      });
      created += 1;
    }
  }

  for (const event of spec.events) {
    const existing = await TrainingEvent.findOne({
      where: { center_id: center.id, title: event.title },
    });
    const payload = {
      ...event,
      center_id: center.id,
      event_date: addMonths(1),
      address: center.address,
      phone: center.phone,
      email: center.email,
      website: center.website,
      gallery_json: [],
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      updated_at: new Date(),
    };
    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await TrainingEvent.create({
        id: generateUuid(),
        ...payload,
        created_at: new Date(),
      });
      created += 1;
    }
  }

  return { created, updated };
}

async function ensureInstitution(spec) {
  const { user, created: userCreated } = await ensureUser(
    spec.email,
    USER_ROLES.INSTITUTION_PROVIDER
  );
  let institution = await PrivateInstitution.findOne({
    where: { name: spec.institution.name },
  });

  const payload = {
    user_id: user.id,
    ...spec.institution,
    map_url: 'https://maps.google.com',
    photos_json: [],
    social_links_json: [],
    brochures_json: [],
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    updated_at: new Date(),
  };

  if (institution) {
    await institution.update(payload);
  } else {
    institution = await PrivateInstitution.create({
      id: generateUuid(),
      ...payload,
      created_at: new Date(),
    });
  }

  return { institution, userCreated };
}

async function seedInstitutionOfferings(institution, offerings) {
  let created = 0;
  let updated = 0;

  for (const offering of offerings) {
    const existing = await InstitutionOffering.findOne({
      where: {
        institution_id: institution.id,
        offering_type: offering.offering_type,
        title: offering.title,
      },
    });
    const payload = {
      ...offering,
      institution_id: institution.id,
      start_date: addMonths(1),
      end_date: offering.offering_type === 'event' ? addMonths(1) : addMonths(4),
      phone: institution.phone,
      email: institution.email,
      website: institution.website,
      gallery_json: [],
      views_count: existing?.views_count ?? 0,
      clicks_count: existing?.clicks_count ?? 0,
      updated_at: new Date(),
    };

    if (existing) {
      await existing.update(payload);
      updated += 1;
    } else {
      await InstitutionOffering.create({
        id: generateUuid(),
        ...payload,
        created_at: new Date(),
      });
      created += 1;
    }
  }

  return { created, updated };
}

async function main() {
  await connectDatabase();

  console.log('\n=== Directory demo seed ===\n');
  console.log(`Provider/recruiter password: ${TEST_PASSWORD}\n`);

  console.log('--- Societes & offres ---');
  for (const spec of COMPANIES) {
    const { company, recruiter, userCreated } = await ensureCompanyAndRecruiter(spec);
    const result = await seedJobs(company, recruiter, spec.jobs);
    console.log(
      `  ${company.name} (${spec.email}, ${userCreated ? 'user created' : 'user ok'}) - jobs created ${result.created}, updated ${result.updated}`
    );
  }

  console.log('\n--- Centres de formation ---');
  for (const spec of TRAINING_CENTERS) {
    const { center, userCreated } = await ensureTrainingCenter(spec);
    const result = await seedTrainingContent(center, spec);
    console.log(
      `  ${center.name} (${spec.email}, ${userCreated ? 'user created' : 'user ok'}) - content created ${result.created}, updated ${result.updated}`
    );
  }

  console.log('\n--- Etablissements prives ---');
  for (const spec of INSTITUTIONS) {
    const { institution, userCreated } = await ensureInstitution(spec);
    const result = await seedInstitutionOfferings(institution, spec.offerings);
    console.log(
      `  ${institution.name} (${spec.email}, ${userCreated ? 'user created' : 'user ok'}) - offerings created ${result.created}, updated ${result.updated}`
    );
  }

  console.log('\nDone.');
  console.log('Candidate directories:');
  console.log('  http://localhost:4200/candidate/annuaire-societes');
  console.log('  http://localhost:4200/candidate/annuaire-formations');
  console.log('  http://localhost:4200/candidate/annuaire-etablissements\n');

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seed directory demo failed:', err.message);
  if (err.stack) console.error(err.stack);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
