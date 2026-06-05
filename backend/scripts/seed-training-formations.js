'use strict';

/**
 * Insère 5 formations de démo pour le centre lié à centre@test.com (idempotent).
 * Usage: npm run db:seed:formations
 * Option: CENTER_EMAIL=autre@mail.com npm run db:seed:formations
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { User, TrainingCenter, TrainingFormation } = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { generateUuid } = require('../src/utils/uuid');
const { CATALOG_PUBLISH_STATUS } = require('../src/config/constants');

const CENTER_EMAIL = process.env.CENTER_EMAIL || 'centre@test.com';
const TITLE_PREFIX = '[Demo] ';

const FORMATIONS = [
  {
    title: `${TITLE_PREFIX}Développement web Full Stack`,
    category: 'Informatique & digital',
    short_description:
      'Parcours intensif HTML, CSS, JavaScript, Angular et Node.js avec projet fil rouge.',
    description:
      '<p>Formation complète sur 12 semaines : front-end, back-end, API REST et déploiement. Certificat délivré en fin de parcours.</p>',
    duration_label: '12 semaines',
    city: 'Tunis',
    delivery_mode: 'hybrid',
    price: 2400,
    certificate_delivered: true,
    seats: 20,
  },
  {
    title: `${TITLE_PREFIX}Anglais professionnel — niveau B2`,
    category: 'Langues',
    short_description: 'Communication écrite et orale en contexte professionnel.',
    description:
      '<p>Sessions interactives, simulations d’entretiens et rédaction d’e-mails professionnels.</p>',
    duration_label: '40 h',
    city: 'Sfax',
    delivery_mode: 'onsite',
    price: 890,
    certificate_delivered: true,
    seats: 15,
  },
  {
    title: `${TITLE_PREFIX}Management d’équipe agile`,
    category: 'Management & leadership',
    short_description: 'Scrum, Kanban et facilitation pour chefs de projet et managers.',
    description:
      '<p>Ateliers pratiques, études de cas et plan d’action personnalisé pour votre équipe.</p>',
    duration_label: '5 jours',
    city: 'Tunis',
    delivery_mode: 'onsite',
    price: 1200,
    certificate_delivered: false,
    seats: 12,
  },
  {
    title: `${TITLE_PREFIX}Marketing digital & réseaux sociaux`,
    category: 'Marketing & communication',
    short_description: 'SEO, publicité Meta/Google et stratégie de contenu.',
    description:
      '<p>Création de campagnes, analyse des KPIs et mise en place d’un calendrier éditorial.</p>',
    duration_label: '8 semaines',
    city: 'Sousse',
    delivery_mode: 'online',
    price: 750,
    certificate_delivered: true,
    seats: 25,
  },
  {
    title: `${TITLE_PREFIX}Comptabilité générale — initiation`,
    category: 'Comptabilité & finance',
    short_description: 'Bases de la comptabilité, bilan et compte de résultat.',
    description:
      '<p>Exercices pratiques sur logiciel, cas concrets PME et préparation au métier d’assistant comptable.</p>',
    duration_label: '60 h',
    city: 'Tunis',
    delivery_mode: 'hybrid',
    price: 650,
    certificate_delivered: true,
    seats: 18,
  },
];

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

async function main() {
  await connectDatabase();

  const user = await User.findOne({ where: { email: CENTER_EMAIL } });
  if (!user) {
    throw new Error(`Utilisateur ${CENTER_EMAIL} introuvable. Créez le compte centre d'abord.`);
  }

  const center = await TrainingCenter.findOne({ where: { user_id: user.id } });
  if (!center) {
    throw new Error(`Aucun centre de formation lié à ${CENTER_EMAIL}.`);
  }

  if (center.status !== CATALOG_PUBLISH_STATUS.PUBLISHED) {
    await center.update({ status: CATALOG_PUBLISH_STATUS.PUBLISHED });
    console.log(`Centre "${center.name}" passé en statut published (visible sur /centres-formation).`);
  }

  const startBase = new Date();
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < FORMATIONS.length; i++) {
    const spec = FORMATIONS[i];
    const existing = await TrainingFormation.findOne({
      where: { center_id: center.id, title: spec.title },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const startDate = addMonths(startBase, i);
    const endDate = addMonths(startBase, i + 2);

    await TrainingFormation.create({
      id: generateUuid(),
      center_id: center.id,
      title: spec.title,
      category: spec.category,
      short_description: spec.short_description,
      description: spec.description,
      start_date: startDate,
      end_date: endDate,
      duration_label: spec.duration_label,
      city: spec.city,
      address: center.address,
      delivery_mode: spec.delivery_mode,
      price: spec.price,
      certificate_delivered: spec.certificate_delivered,
      seats: spec.seats,
      phone: center.phone,
      email: center.email,
      website: center.website,
      status: CATALOG_PUBLISH_STATUS.PUBLISHED,
      gallery_json: [],
    });
    created++;
  }

  console.log('\n=== Formations de test ===');
  console.log('Centre:', center.name, `(${CENTER_EMAIL})`);
  console.log('ID centre:', center.id);
  console.log('Créées:', created, '| Déjà présentes:', skipped);
  console.log('\nAffichage public (centre + formations publiées) :');
  console.log(`  http://localhost:4200/centres-formation/${center.id}`);
  console.log('Modération admin : http://localhost:4200/admin/training-formations\n');

  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
