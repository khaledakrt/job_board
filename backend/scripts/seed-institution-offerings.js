'use strict';

/**
 * Insère des contenus de démo pour l'espace établissement privé.
 * Usage: npm run db:seed:institution-offerings
 * Option: INSTITUTION_EMAIL=etablissement@test.com npm run db:seed:institution-offerings
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { User, PrivateInstitution, InstitutionOffering } = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { CATALOG_PUBLISH_STATUS, USER_ROLES } = require('../src/config/constants');
const { generateUuid } = require('../src/utils/uuid');
const { hashPassword } = require('../src/utils/password');

const INSTITUTION_EMAIL = process.env.INSTITUTION_EMAIL || 'etablissement@test.com';
const TEST_PASSWORD = 'Test1234!';
const TITLE_PREFIX = '[Demo] ';

const OFFERINGS = [
  {
    offering_type: 'program',
    title: `${TITLE_PREFIX}Cycle préparatoire intégré`,
    summary: 'Deux années de préparation scientifique avec encadrement renforcé et orientation progressive.',
    description:
      '<p><strong>Programme intensif</strong> en mathématiques, physique et informatique avec projets pratiques, suivi pédagogique et préparation aux concours.</p><p><a href="https://example.com/admission">Voir les conditions d’admission</a></p>',
    category: 'Préparatoire scientifique',
    start_date: nextDate(1),
    end_date: nextDate(5),
    city: 'Tunis',
    address: 'Campus principal, Tunis',
    seats: 80,
    phone: '+216 71 000 000',
    email: 'admission@horizon-demo.tn',
    website: 'https://example.com/programmes/prepa',
    status: 'published',
  },
  {
    offering_type: 'program',
    title: `${TITLE_PREFIX}Licence informatique appliquée`,
    summary: 'Parcours professionnalisant en développement logiciel, bases de données et projets web.',
    description:
      '<p>Formation sur 3 ans avec stages, ateliers Angular/Node.js et accompagnement carrière. Les étudiants réalisent un projet complet chaque année.</p>',
    category: 'Informatique',
    start_date: nextDate(2),
    end_date: nextDate(6),
    city: 'Tunis',
    seats: 45,
    email: 'informatique@horizon-demo.tn',
    website: 'https://example.com/programmes/informatique',
    status: 'pending',
  },
  {
    offering_type: 'event',
    title: `${TITLE_PREFIX}Journée portes ouvertes 2026`,
    summary: 'Rencontrez l’équipe pédagogique, visitez le campus et découvrez les filières proposées.',
    description:
      '<p>Au programme : présentation des filières, visite des laboratoires, rencontre avec les étudiants et atelier questions/réponses.</p>',
    category: 'Admission',
    event_type: 'open_day',
    start_date: nextDate(1),
    end_date: nextDate(1),
    start_time: '09:00',
    end_time: '14:00',
    city: 'Tunis',
    address: 'Campus principal, salle polyvalente',
    seats: 120,
    phone: '+216 71 000 000',
    email: 'events@horizon-demo.tn',
    website: 'https://example.com/events/open-day',
    status: 'published',
  },
  {
    offering_type: 'event',
    title: `${TITLE_PREFIX}Webinaire orientation post-bac`,
    summary: 'Session en ligne pour comprendre les parcours, les débouchés et les modalités d’inscription.',
    description:
      '<p>Webinaire animé par le service admission avec un temps dédié aux questions des parents et candidats.</p>',
    category: 'Orientation',
    event_type: 'webinar',
    start_date: nextDate(3),
    end_date: nextDate(3),
    start_time: '18:00',
    end_time: '19:30',
    city: 'En ligne',
    seats: 200,
    email: 'orientation@horizon-demo.tn',
    website: 'https://example.com/webinaire-orientation',
    status: 'pending',
  },
  {
    offering_type: 'announcement',
    title: `${TITLE_PREFIX}Ouverture des inscriptions 2026`,
    summary: 'Les candidatures sont ouvertes pour les nouveaux programmes et les admissions parallèles.',
    description:
      '<p>Les dossiers peuvent être déposés en ligne. Les candidats présélectionnés seront contactés pour un entretien d’orientation.</p><p><a href="https://example.com/inscription">Déposer une candidature</a></p>',
    category: 'Admissions',
    start_date: today(),
    end_date: nextDate(4),
    city: 'Tunis',
    email: 'admission@horizon-demo.tn',
    website: 'https://example.com/inscription',
    status: 'published',
  },
  {
    offering_type: 'announcement',
    title: `${TITLE_PREFIX}Nouveau laboratoire numérique`,
    summary: 'Un espace équipé pour les ateliers robotique, IA et développement web avancé.',
    description:
      '<p>Le laboratoire accueille les étudiants pour les projets encadrés, hackathons internes et clubs techniques.</p>',
    category: 'Campus',
    start_date: today(),
    city: 'Tunis',
    status: 'draft',
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextDate(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function ensureUser() {
  let user = await User.findOne({ where: { email: INSTITUTION_EMAIL } });
  if (user) {
    await user.update({
      role: USER_ROLES.INSTITUTION_PROVIDER,
      is_verified: true,
      is_banned: false,
      verification_token: null,
    });
    return { user, created: false };
  }

  user = await User.create({
    id: generateUuid(),
    email: INSTITUTION_EMAIL,
    password_hash: await hashPassword(TEST_PASSWORD),
    role: USER_ROLES.INSTITUTION_PROVIDER,
    is_verified: true,
    verification_token: null,
    reset_token: null,
    reset_expires: null,
    created_at: new Date(),
  });
  return { user, created: true };
}

async function ensureInstitution(user) {
  let institution = await PrivateInstitution.findOne({ where: { user_id: user.id } });
  if (institution) {
    await institution.update({
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      description:
        institution.description ||
        '<p>Établissement privé de démonstration avec programmes, événements et annonces.</p>',
      short_description:
        institution.short_description ||
        'Établissement privé de démonstration pour tester les pages fournisseur.',
      city: institution.city || 'Tunis',
      phone: institution.phone || '+216 71 000 000',
      email: institution.email || INSTITUTION_EMAIL,
      website: institution.website || 'https://example.com',
    });
    return institution;
  }

  institution = await PrivateInstitution.create({
    id: generateUuid(),
    user_id: user.id,
    name: 'Institut Privé Horizon Demo',
    institution_type: 'higher_institute',
    logo_url: null,
    description:
      '<p><strong>Institut Privé Horizon Demo</strong> est un établissement de démonstration pour valider les pages programmes, événements et annonces.</p>',
    short_description:
      'Établissement privé de démonstration pour tester les contenus publiés.',
    city: 'Tunis',
    address: 'Avenue de la Formation, Tunis',
    phone: '+216 71 000 000',
    email: INSTITUTION_EMAIL,
    website: 'https://example.com',
    map_url: 'https://maps.google.com',
    photos_json: [],
    social_links_json: [{ label: 'LinkedIn', url: 'https://example.com/linkedin' }],
    programs_json: [
      { title: 'Cycle préparatoire intégré', description: 'Parcours scientifique préparatoire.' },
      { title: 'Licence informatique appliquée', description: 'Développement logiciel et web.' },
    ],
    brochures_json: [],
    status: CATALOG_PUBLISH_STATUS.PUBLISHED,
    created_at: new Date(),
    updated_at: new Date(),
  });
  return institution;
}

async function main() {
  await connectDatabase();

  const { user, created } = await ensureUser();
  const institution = await ensureInstitution(user);

  let inserted = 0;
  let updated = 0;

  for (const spec of OFFERINGS) {
    const existing = await InstitutionOffering.findOne({
      where: {
        institution_id: institution.id,
        offering_type: spec.offering_type,
        title: spec.title,
      },
    });

    const payload = {
      ...spec,
      institution_id: institution.id,
      gallery_json: [],
      main_image_url: null,
      price: null,
      admin_note: null,
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
      inserted += 1;
    }
  }

  console.log('\n=== Institution demo seed ===');
  console.log(`User: ${INSTITUTION_EMAIL} (${created ? 'created' : 'already exists'})`);
  console.log(`Password: ${TEST_PASSWORD}`);
  console.log(`Institution: ${institution.name} (${institution.id})`);
  console.log(`Offerings inserted: ${inserted}, updated: ${updated}`);
  console.log('Pages: /provider/etablissement/programmes, /evenements, /annonces\n');

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDatabase().catch(() => {});
  process.exit(1);
});
