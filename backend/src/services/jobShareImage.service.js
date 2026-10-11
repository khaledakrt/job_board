'use strict';

const fs = require('fs/promises');
const sharp = require('sharp');
const { LOGO_UPLOAD } = require('../config/constants');
const { resolveFilePathFromUrl } = require('../utils/fileStorage');

const WIDTH = 1200;
const HEIGHT = 627;

const REMOTE_LABELS = {
  'on-site': 'Sur site',
  hybrid: 'Hybride',
  remote: 'Télétravail',
};

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapLines(value, maxChars, maxLines) {
  const words = String(value ?? '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxChars) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines) {
    const consumed = lines.join(' ').split(/\s+/).length;
    if (consumed < words.length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length > maxChars - 1 ? `${last.slice(0, maxChars - 1).trim()}…` : `${last}…`;
    }
  }
  return lines;
}

function initials(name) {
  const parts = String(name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const letters = parts.map((part) => part[0]).join('').toUpperCase();
  return letters || 'TJ';
}

async function loadLogo(logoUrl) {
  const filePath = resolveFilePathFromUrl(logoUrl, LOGO_UPLOAD.SUBDIRECTORY);
  if (!filePath) return null;
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function buildSvg(job) {
  const company = job.company?.name || 'Entreprise';
  const titleLines = wrapLines(job.title || 'Offre d’emploi', 26, 2);
  const facts = [job.contractType, job.location || REMOTE_LABELS[job.remoteType]].filter(Boolean);
  const textX = 430;
  let titleSvg = '';
  titleLines.forEach((line, index) => {
    titleSvg += `<text x="${textX}" y="${190 + index * 68}" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="#0f172a">${escapeXml(line)}</text>`;
  });

  let cursor = textX;
  const companyY = 190 + titleLines.length * 68 + 20;
  const factY = companyY + 36;
  let factsSvg = '';
  for (const fact of facts) {
    const width = Math.max(92, 36 + fact.length * 15);
    factsSvg += `<rect x="${cursor}" y="${factY}" rx="20" width="${width}" height="46" fill="#e7f0fb"/>`;
    factsSvg += `<text x="${cursor + 18}" y="${factY + 31}" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="#0a3d91">${escapeXml(fact)}</text>`;
    cursor += width + 14;
  }

  const mark = escapeXml(initials(company));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#f6f3ee"/>
  <rect width="${WIDTH}" height="14" fill="#0a3d91"/>
  <rect x="72" y="150" width="300" height="300" rx="36" fill="#ffffff"/>
  <text x="222" y="322" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="72" font-weight="700" fill="#0a3d91">${mark}</text>
  ${titleSvg}
  <text x="${textX}" y="${companyY}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#334155">${escapeXml(company)}</text>
  ${factsSvg}
  <text x="72" y="560" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#0a3d91">Tun Job Board</text>
  <text x="1128" y="560" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#64748b">tun-job-board.com</text>
</svg>`;
}

async function renderJobShareCard(job) {
  const svg = buildSvg(job);
  let image = sharp(Buffer.from(svg));
  const logo = await loadLogo(job.company?.logoUrl);
  if (logo) {
    const badge = await sharp(logo)
      .resize(240, 140, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
    const cover = await sharp({
      create: { width: 260, height: 180, channels: 3, background: '#ffffff' },
    })
      .png()
      .toBuffer();
    image = sharp(Buffer.from(svg)).composite([
      { input: cover, left: 92, top: 210 },
      { input: badge, left: 102, top: 230 },
    ]);
  }

  return image.jpeg({ quality: 90 }).toBuffer();
}

module.exports = {
  renderJobShareCard,
  WIDTH,
  HEIGHT,
};
