'use strict';

/**
 * Inserts 3 realistic active job offers for Acme Corp (recruiter@test.com).
 * Idempotent — skips if a job with the same title already exists for the company.
 * Usage: npm run db:seed:jobs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { User, Company, RecruiterProfile, Job } = require('../src/models');
const { connectDatabase, disconnectDatabase } = require('../src/database/connection');
const { generateUuid } = require('../src/utils/uuid');
const { JOB_STATUS } = require('../src/config/constants');
const { defaultExpiresAt } = require('../src/utils/jobExpiration');

const RECRUITER_EMAIL = 'recruiter@test.com';
const COMPANY_NAME = 'Acme Corp';

const JOBS = [
  {
    title: 'Développeur Full Stack Angular / Node.js (H/F)',
    location: 'Paris 9e',
    remote_type: 'hybrid',
    contract_type: 'CDI',
    salary_label: '45 000 – 55 000 € / an',
    tags: ['Angular', 'Node.js', 'TypeScript', 'MySQL', 'REST API'],
    languages: ['Français', 'Anglais'],
    experience_years: 3,
    description: `Acme Corp accélère le développement de sa plateforme SaaS RH. Nous recherchons un(e) Développeur(se) Full Stack pour rejoindre une équipe produit de 8 personnes, en méthode Scrum (sprints de 2 semaines).

Missions principales :
• Concevoir et développer de nouvelles fonctionnalités front (Angular 19+) et back (Node.js / Express)
• Participer aux revues de code, à la définition technique et à l'amélioration continue (tests, CI/CD)
• Collaborer avec le Product Owner et l'équipe design sur l'expérience utilisateur
• Maintenir et faire évoluer l'API REST et le schéma MySQL (Sequelize)
• Documenter les choix techniques et assurer la qualité des livrables

Environnement :
• Stack : Angular, TypeScript, Tailwind, Node.js, Express, MySQL, JWT
• Outils : Git, GitHub Actions, Docker, Jira, Figma
• Rythme : 2 jours de télétravail / semaine, bureaux proches métro Grands Boulevards

Profil recherché :
• 3+ ans d'expérience sur un poste Full Stack ou équivalent
• Maîtrise d'Angular et d'un framework back Node.js
• Bonnes pratiques : tests unitaires, sécurité API, revues de code
• Autonomie, curiosité, envie de contribuer à un produit en croissance

Avantages :
• Salaire selon profil + participation
• Tickets restaurant, mutuelle premium, budget formation 2 000 €/an
• RTT, équipement MacBook Pro, onboarding structuré sur 4 semaines`,
    requirements: `Compétences requises :
• Angular 15+ (Signals, standalone components appréciés)
• Node.js / Express, architecture REST
• TypeScript, HTML/CSS (Tailwind ou équivalent)
• SQL (MySQL ou PostgreSQL)
• Git, notions CI/CD

Compétences appréciées :
• Sequelize ou ORM équivalent
• Tests (Jest, Jasmine, Supertest)
• Expérience SaaS B2B ou RH Tech

Diplôme : Bac+3 minimum (école d'ingénieur, master informatique ou expérience équivalente)
Langues : Français courant, anglais technique (B2+)`,
  },
  {
    title: 'Ingénieur DevOps Cloud AWS (H/F)',
    location: 'Lyon 3e',
    remote_type: 'remote',
    contract_type: 'CDI',
    salary_label: '50 000 – 65 000 € / an',
    tags: ['AWS', 'Terraform', 'Kubernetes', 'CI/CD', 'Docker'],
    languages: ['Français', 'Anglais'],
    experience_years: 5,
    description: `Dans le cadre de la modernisation de notre infrastructure, Acme Corp recrute un(e) Ingénieur(e) DevOps pour fiabiliser nos déploiements et accompagner la montée en charge de notre plateforme (10k+ utilisateurs actifs).

Vos missions :
• Concevoir et maintenir les pipelines CI/CD (build, tests, déploiements blue/green)
• Administrer l'infrastructure AWS (ECS, RDS, S3, CloudFront, IAM, VPC)
• Industrialiser l'infrastructure as code (Terraform) et la conteneurisation (Docker)
• Mettre en place le monitoring, alerting et la gestion des incidents (CloudWatch, Grafana)
• Sécuriser les environnements (secrets, durcissement, audits réguliers)
• Travailler en étroite collaboration avec les équipes dev et support N2

Contexte technique :
• Hébergement AWS multi-environnements (dev / staging / prod)
• Applications Node.js conteneurisées, base MySQL managée
• Objectif : 99,9 % de disponibilité, RTO < 2 h

Modalités :
• Poste 100 % télétravail (France), déplacements ponctuels à Lyon (1x/trimestre)
• Astreinte légère une semaine sur quatre (compensée)`,
    requirements: `Profil :
• 4+ ans d'expérience DevOps / SRE / administrateur cloud
• Expertise AWS (certification Solutions Architect ou DevOps Engineer = plus)
• Terraform, Docker, Kubernetes (EKS ou équivalent)
• CI/CD : GitHub Actions, GitLab CI ou Jenkins
• Scripting : Bash, Python ou Node.js

Soft skills :
• Rigueur, sens du service, capacité à vulgariser pour les équipes métier
• Anglais technique lu/écrit

Processus de recrutement :
1. Entretien RH (30 min)
2. Entretien technique avec le Lead DevOps (1 h)
3. Entretien final avec le CTO (45 min)`,
  },
  {
    title: 'Product Owner SaaS B2B — RH & Recrutement (H/F)',
    location: 'Paris 2e',
    remote_type: 'hybrid',
    contract_type: 'CDI',
    salary_label: '48 000 – 58 000 € / an',
    tags: ['Product Owner', 'Agile', 'SaaS', 'B2B', 'Roadmap'],
    languages: ['Français', 'Anglais', 'Espagnol'],
    experience_years: 4,
    description: `Acme Corp édite une solution de gestion des candidatures et d'offres d'emploi à destination des PME et ETI. Nous cherchons un(e) Product Owner pour porter la vision produit, prioriser la roadmap et maximiser la valeur livrée aux recruteurs et candidats.

Responsabilités :
• Recueillir et formaliser les besoins clients (interviews, analytics, support)
• Rédiger et maintenir le backlog produit (user stories, critères d'acceptation)
• Animer les cérémonies Agile avec l'équipe dev (planning, revue, rétro)
• Définir et suivre les KPIs produit (activation, rétention, NPS, time-to-hire)
• Coordonner les releases avec le marketing et le customer success
• Veiller à la cohérence UX sur les parcours recruteur et candidat

Équipe :
• 2 PO, 8 développeurs, 1 designer UX, 1 QA, 1 data analyst
• Roadmap trimestrielle alignée sur la stratégie « scale-up » 2026

Lieu & organisation :
• Bureaux Paris Opéra — 3 jours sur site / 2 jours remote
• Participation aux salons RH et webinaires clients (2-3 fois/an)`,
    requirements: `Expérience :
• 3+ ans en Product Owner ou Product Manager sur un produit SaaS B2B
• Maîtrise des méthodes Agile (Scrum) et outils (Jira, Confluence, Miro)
• Capacité à rédiger des spécifications claires et des wireframes (Figma)
• À l'aise avec les métriques produit et A/B testing

Domaine apprécié :
• RH Tech, ATS, job boards, marketplaces

Formation : Bac+5 commerce / école de management / ingénieur avec spécialisation produit
Langues : Français natif ou C1, anglais professionnel

Ce que nous offrons :
• Package fixe + variable sur objectifs produit
• Carte titre-restaurant, télétravail, 25 CP + RTT
• Culture feedback, 1:1 bi-mensuels avec le Head of Product`,
  },
];

async function resolveRecruiterContext() {
  const user = await User.findOne({ where: { email: RECRUITER_EMAIL } });
  if (!user) {
    throw new Error(
      `User ${RECRUITER_EMAIL} not found. Run: npm run db:seed`
    );
  }

  const company = await Company.findOne({ where: { name: COMPANY_NAME } });
  if (!company) {
    throw new Error(`Company "${COMPANY_NAME}" not found. Run: npm run db:seed`);
  }

  const recruiter = await RecruiterProfile.findOne({
    where: { user_id: user.id, company_id: company.id },
  });
  if (!recruiter) {
    throw new Error('Recruiter profile not found. Run: npm run db:seed');
  }

  return { company, recruiter };
}

async function main() {
  await connectDatabase();

  const { company, recruiter } = await resolveRecruiterContext();

  console.log(`\n=== Seeding jobs for ${COMPANY_NAME} ===\n`);

  let created = 0;
  let skipped = 0;

  for (const spec of JOBS) {
    const existing = await Job.findOne({
      where: { company_id: company.id, title: spec.title },
    });

    if (existing) {
      console.log(`[skip] ${spec.title}`);
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
      experience_years: spec.experience_years ?? null,
      location: spec.location,
      remote_type: spec.remote_type,
      contract_type: spec.contract_type,
      salary_label: spec.salary_label,
      status: JOB_STATUS.ACTIVE,
      expires_at: defaultExpiresAt(),
      views_count: Math.floor(Math.random() * 80) + 20,
      applications_count: 0,
      created_at: new Date(),
    });

    console.log(`[ok]   ${spec.title}`);
    created += 1;
  }

  console.log(`\nDone: ${created} created, ${skipped} already present.`);
  console.log('View as candidate: http://localhost:4200/candidate/jobs\n');

  await disconnectDatabase();
}

main().catch(async (err) => {
  console.error('Seed jobs failed:', err.message);
  try {
    await disconnectDatabase();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
