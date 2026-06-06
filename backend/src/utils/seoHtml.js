'use strict';

const fs = require('fs/promises');
const path = require('path');
const { env } = require('../config');

const DEFAULT_INDEX_CANDIDATES = [
  path.resolve(process.cwd(), '..', 'site', 'index.html'),
  path.resolve(process.cwd(), '..', 'frontend', 'src', 'index.html'),
];

function publicSiteUrl() {
  return (env.CLIENT_URL || env.API_PUBLIC_URL).replace(/\/$/, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&lsquo;/gi, "'")
    .replace(/&rdquo;/gi, '"')
    .replace(/&ldquo;/gi, '"')
    .replace(/&bull;/gi, '•')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(value, maxLength) {
  const text = String(value ?? '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trim()}…`;
}

function absoluteUrl(url) {
  if (!url) return null;

  const raw = String(url).trim();
  const uploadsIndex = raw.indexOf('/uploads/');
  if (uploadsIndex !== -1) {
    return `${publicSiteUrl()}${raw.slice(uploadsIndex).split(/[?#]/)[0]}`;
  }

  if (raw.startsWith('https://')) return raw;
  if (raw.startsWith('http://')) return raw.replace(/^http:\/\/[^/]+/, publicSiteUrl());
  return `${publicSiteUrl()}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

async function readFrontendIndex() {
  const configuredPath = process.env.FRONTEND_INDEX_PATH
    ? path.resolve(process.env.FRONTEND_INDEX_PATH)
    : null;
  const candidates = configuredPath
    ? [configuredPath, ...DEFAULT_INDEX_CANDIDATES]
    : DEFAULT_INDEX_CANDIDATES;

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  throw new Error('Frontend index.html not found for SEO rendering');
}

function metaTag(name, content, property = false) {
  if (!content) return '';
  const attr = property ? 'property' : 'name';
  return `<meta ${attr}="${escapeHtml(name)}" content="${escapeHtml(content)}" />`;
}

function buildJobPosting(job, url, imageUrl, description) {
  const company = job.company || {};
  const location = job.location || company.city || company.country;
  const json = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description,
    datePosted: job.createdAt,
    validThrough: job.expiresAt,
    employmentType: job.contractType,
    url,
    hiringOrganization: {
      '@type': 'Organization',
      name: company.name || 'JobBoard',
      sameAs: company.website || publicSiteUrl(),
      ...(imageUrl ? { logo: imageUrl } : {}),
    },
  };

  if (job.remoteType === 'remote') {
    json.jobLocationType = 'TELECOMMUTE';
    json.applicantLocationRequirements = {
      '@type': 'Country',
      name: company.country || 'Tunisia',
    };
  } else if (location) {
    json.jobLocation = {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        streetAddress: company.street_address || undefined,
        addressLocality: company.city || job.location || undefined,
        postalCode: company.postal_code || undefined,
        addressCountry: company.country || undefined,
      },
    };
  }

  return JSON.stringify(json).replace(/</g, '\\u003c');
}

function safeJsonLd(json) {
  return JSON.stringify(json).replace(/</g, '\\u003c');
}

function firstImage(...candidates) {
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const found = candidate.find(Boolean);
      if (found) return absoluteUrl(found);
    } else if (candidate) {
      return absoluteUrl(candidate);
    }
  }
  return absoluteUrl('/og-default.svg');
}

function injectSeo(html, { title, description, url, imageUrl, ogType = 'website', jsonLd }) {
  const jsonLdTags = Array.isArray(jsonLd) ? jsonLd : [jsonLd].filter(Boolean);
  const tags = [
    metaTag('description', description),
    '<meta name="robots" content="index,follow" />',
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    metaTag('og:type', ogType, true),
    metaTag('og:site_name', 'JobBoard', true),
    metaTag('og:title', title, true),
    metaTag('og:description', description, true),
    metaTag('og:url', url, true),
    metaTag('og:image', imageUrl, true),
    metaTag('twitter:card', imageUrl ? 'summary_large_image' : 'summary'),
    metaTag('twitter:title', title),
    metaTag('twitter:description', description),
    metaTag('twitter:image', imageUrl),
    ...jsonLdTags.map((item) => `<script type="application/ld+json">${safeJsonLd(item)}</script>`),
  ]
    .filter(Boolean)
    .join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace('</head>', `    ${tags}\n  </head>`);
}

async function renderSeoHtml({ title, description, path: pagePath, imageUrl, ogType, jsonLd }) {
  const html = await readFrontendIndex();
  return injectSeo(html, {
    title,
    description: truncate(stripHtml(description), 220),
    url: `${publicSiteUrl()}${pagePath}`,
    imageUrl: imageUrl ? absoluteUrl(imageUrl) : firstImage(),
    ogType,
    jsonLd,
  });
}

function organizationJsonLd(entity, url, imageUrl, type = 'Organization') {
  const json = {
    '@context': 'https://schema.org',
    '@type': type,
    name: entity.name,
    description: stripHtml(entity.description || entity.shortDescription || ''),
    url,
    sameAs: entity.linkedinUrl || entity.website || undefined,
    address: entity.city
      ? {
          '@type': 'PostalAddress',
          addressLocality: entity.city,
          addressCountry: entity.country || undefined,
        }
      : undefined,
  };
  if (imageUrl) json.logo = imageUrl;
  return json;
}

function collectionJsonLd(title, description, url) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
  };
}

async function renderJobSeoHtml(job) {
  const companyName = job.company?.name || 'JobBoard';
  const title = `${job.title} - ${companyName}`;
  const descriptionParts = [
    stripHtml(job.description),
    job.location ? `Lieu: ${job.location}` : null,
    job.contractType ? `Contrat: ${job.contractType}` : null,
  ].filter(Boolean);
  const description = truncate(descriptionParts.join(' · '), 220);
  const url = `${publicSiteUrl()}/offres/${job.id}`;
  const imageUrl = absoluteUrl(job.company?.logoUrl);
  const jobPostingJson = JSON.parse(buildJobPosting(job, url, imageUrl, stripHtml(job.description)));
  const html = await readFrontendIndex();

  return injectSeo(html, {
    title,
    description,
    url,
    imageUrl: imageUrl || firstImage(),
    ogType: 'article',
    jsonLd: jobPostingJson,
  });
}

async function renderHomeSeoHtml() {
  const title = 'JobBoard Tunisie - Offres d’emploi, formations et établissements privés';
  const description =
    'Trouvez des offres d’emploi, découvrez des centres de formation et explorez les établissements privés en Tunisie sur JobBoard.';
  const url = publicSiteUrl();
  return renderSeoHtml({
    title,
    description,
    path: '/',
    imageUrl: '/og-default.svg',
    ogType: 'website',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'JobBoard Tunisie',
      url,
      description,
    },
  });
}

async function renderCompanySeoHtml(company) {
  const title = `${company.name} - Entreprise sur JobBoard`;
  const description =
    company.description ||
    [company.industry, company.locationLabel, 'Découvrez les offres publiées par cette entreprise.']
      .filter(Boolean)
      .join(' · ');
  const path = `/entreprises/${company.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(company.logoUrl);
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'profile',
    jsonLd: organizationJsonLd(company, url, imageUrl),
  });
}

async function renderTrainingCentersListSeoHtml() {
  const title = 'Centres de formation en Tunisie - JobBoard';
  const description =
    'Découvrez des centres de formation, leurs programmes, formations et événements publiés sur JobBoard.';
  const path = '/centres-formation';
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl: '/og-default.svg',
    ogType: 'website',
    jsonLd: collectionJsonLd(title, description, `${publicSiteUrl()}${path}`),
  });
}

async function renderTrainingCenterSeoHtml(center) {
  const title = `${center.name} - Centre de formation`;
  const description =
    center.shortDescription ||
    center.description ||
    [center.trainingDomain, center.city, 'Découvrez ce centre de formation sur JobBoard.']
      .filter(Boolean)
      .join(' · ');
  const path = `/centres-formation/${center.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(center.logoUrl, center.photos);
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'profile',
    jsonLd: organizationJsonLd(center, url, imageUrl, 'EducationalOrganization'),
  });
}

async function renderFormationSeoHtml(formation) {
  const title = `${formation.title} - ${formation.centerName || 'Formation'}`;
  const description =
    formation.shortDescription ||
    formation.description ||
    [formation.category, formation.city, formation.durationLabel].filter(Boolean).join(' · ');
  const path = `/centres-formation/formations/${formation.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(formation.mainImageUrl, formation.gallery, formation.centerLogoUrl);
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: formation.title,
      description: stripHtml(description),
      url,
      provider: formation.centerName
        ? {
            '@type': 'EducationalOrganization',
            name: formation.centerName,
            sameAs: formation.centerWebsite || undefined,
          }
        : undefined,
      image: imageUrl,
    },
  });
}

async function renderTrainingEventSeoHtml(event) {
  const title = `${event.title} - ${event.centerName || 'Événement'}`;
  const description =
    event.description ||
    [event.eventType, event.city, event.eventDate].filter(Boolean).join(' · ');
  const path = `/centres-formation/evenements/${event.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(event.posterImageUrl, event.gallery, event.centerLogoUrl);
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: event.title,
      description: stripHtml(description),
      url,
      startDate: event.eventDate,
      image: imageUrl,
      eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      organizer: event.centerName
        ? {
            '@type': 'Organization',
            name: event.centerName,
            sameAs: event.centerWebsite || undefined,
          }
        : undefined,
      location: event.city
        ? {
            '@type': 'Place',
            name: event.city,
            address: event.address || event.city,
          }
        : undefined,
    },
  });
}

async function renderPrivateInstitutionsListSeoHtml() {
  const title = 'Établissements privés en Tunisie - JobBoard';
  const description =
    'Découvrez des établissements privés, leurs programmes, événements, annonces et opportunités publiés sur JobBoard.';
  const path = '/etablissements-prives';
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl: '/og-default.svg',
    ogType: 'website',
    jsonLd: collectionJsonLd(title, description, `${publicSiteUrl()}${path}`),
  });
}

async function renderPrivateInstitutionSeoHtml(institution) {
  const title = `${institution.name} - Établissement privé`;
  const description =
    institution.shortDescription ||
    institution.description ||
    [institution.institutionType, institution.city].filter(Boolean).join(' · ');
  const path = `/etablissements-prives/${institution.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(institution.logoUrl, institution.photos);
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'profile',
    jsonLd: organizationJsonLd(institution, url, imageUrl, 'EducationalOrganization'),
  });
}

async function renderInstitutionOfferingSeoHtml(offering) {
  const title = `${offering.title} - ${offering.institution?.name || 'Établissement privé'}`;
  const description =
    offering.summary ||
    offering.description ||
    [offering.category, offering.city, offering.offeringType].filter(Boolean).join(' · ');
  const path = `/etablissements-prives/publications/${offering.id}`;
  const url = `${publicSiteUrl()}${path}`;
  const imageUrl = firstImage(
    offering.mainImageUrl,
    offering.gallery,
    offering.institution?.logoUrl
  );
  return renderSeoHtml({
    title,
    description,
    path,
    imageUrl,
    ogType: 'article',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': offering.offeringType === 'event' ? 'Event' : 'CreativeWork',
      name: offering.title,
      headline: offering.title,
      description: stripHtml(description),
      url,
      image: imageUrl,
      datePublished: offering.createdAt,
      startDate: offering.startDate || undefined,
      author: offering.institution?.name
        ? {
            '@type': 'EducationalOrganization',
            name: offering.institution.name,
          }
        : undefined,
    },
  });
}

module.exports = {
  renderJobSeoHtml,
  renderHomeSeoHtml,
  renderCompanySeoHtml,
  renderTrainingCentersListSeoHtml,
  renderTrainingCenterSeoHtml,
  renderFormationSeoHtml,
  renderTrainingEventSeoHtml,
  renderPrivateInstitutionsListSeoHtml,
  renderPrivateInstitutionSeoHtml,
  renderInstitutionOfferingSeoHtml,
};
