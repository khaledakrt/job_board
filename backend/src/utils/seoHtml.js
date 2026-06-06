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

function injectSeo(html, { title, description, url, imageUrl, jobPostingJson }) {
  const tags = [
    metaTag('description', description),
    '<meta name="robots" content="index,follow" />',
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    metaTag('og:type', 'article', true),
    metaTag('og:site_name', 'JobBoard', true),
    metaTag('og:title', title, true),
    metaTag('og:description', description, true),
    metaTag('og:url', url, true),
    metaTag('og:image', imageUrl, true),
    metaTag('twitter:card', imageUrl ? 'summary_large_image' : 'summary'),
    metaTag('twitter:title', title),
    metaTag('twitter:description', description),
    metaTag('twitter:image', imageUrl),
    `<script type="application/ld+json">${jobPostingJson}</script>`,
  ]
    .filter(Boolean)
    .join('\n    ');

  return html
    .replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '')
    .replace('</head>', `    ${tags}\n  </head>`);
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
  const jobPostingJson = buildJobPosting(job, url, imageUrl, stripHtml(job.description));
  const html = await readFrontendIndex();

  return injectSeo(html, {
    title,
    description,
    url,
    imageUrl,
    jobPostingJson,
  });
}

module.exports = {
  renderJobSeoHtml,
};
