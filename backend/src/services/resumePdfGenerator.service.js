'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateUuid } = require('../utils/uuid');
const {
  ensureResumeDirectory,
  getResumeDirectory,
  buildResumePublicUrl,
  resolveFilePathFromUrl,
} = require('../utils/fileStorage');
const { AVATAR_UPLOAD } = require('../config/constants');
const ApiError = require('../utils/ApiError');

const HEADER_PHOTO_SIZE = 72;

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

/** Préserve les retours à la ligne (résumé, descriptions de missions). */
function normalizeMultiline(value) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\uFFFD/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function hasMultilineText(value) {
  return normalizeMultiline(value).length > 0;
}

function formatPeriod(start, end) {
  const s = text(start);
  const e = text(end);
  if (s && e) return `${s} — ${e}`;
  if (s) return `${s} — Présent`;
  return e || '';
}

function hasProfileContent(profile) {
  const first = text(profile.firstName);
  const last = text(profile.lastName);
  if (!first || !last) return false;

  const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
  const education = Array.isArray(profile.education) ? profile.education : [];
  const skills = Array.isArray(profile.skills) ? profile.skills : [];

  return (
    Boolean(text(profile.professionalTitle)) ||
    experiences.some((e) => text(e.title) || text(e.company)) ||
    education.some((e) => text(e.degree) || text(e.institution)) ||
    skills.length > 0
  );
}

function writeSectionTitle(doc, title) {
  doc.moveDown(0.6);
  doc.fontSize(12).fillColor('#e65100').text(title.toUpperCase(), { underline: false });
  doc.moveDown(0.25);
  doc.fillColor('#111827');
}

function writeWrapped(doc, content, options = {}) {
  const value = normalizeMultiline(content);
  if (!value) return;
  const font = options.font || 'Helvetica';
  doc.font(font).fontSize(options.size || 10);
  doc.text(value, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: options.align || 'left',
    lineGap: options.lineGap ?? 3,
  });
}

function resolveAvatarPath(avatarUrl) {
  const filePath = resolveFilePathFromUrl(avatarUrl, AVATAR_UPLOAD.SUBDIRECTORY);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }
  return filePath;
}

function drawCircularImage(doc, imagePath, x, y, size) {
  const radius = size / 2;
  const cx = x + radius;
  const cy = y + radius;
  doc.save();
  doc.circle(cx, cy, radius).clip();
  doc.image(imagePath, x, y, { width: size, height: size });
  doc.restore();
}

function getProfileLinks(profile) {
  const links = [];
  const linkedin = String(profile.linkedinUrl ?? '').trim();
  const portfolio = String(profile.portfolioUrl ?? '').trim();
  if (linkedin) links.push({ label: 'LinkedIn', url: linkedin });
  if (portfolio) links.push({ label: 'Portfolio', url: portfolio });
  return links;
}

function drawProfileLinks(doc, links, options = {}) {
  if (!links.length) return;

  const fontSize = options.fontSize ?? 9;
  const { textX, textWidth, centered, y } = options;

  doc.font('Helvetica').fontSize(fontSize);

  if (centered) {
    links.forEach((link, index) => {
      if (index > 0) doc.moveDown(0.1);
      doc.fillColor('#0a66c2').text(link.label, { align: 'center', link: link.url, underline: true });
    });
    doc.fillColor('#111827');
    return;
  }

  let lineY = y ?? doc.y;
  let linkX = textX;
  links.forEach((link, index) => {
    if (index > 0) {
      linkX += 42;
    }
    doc.fillColor('#0a66c2').text(link.label, linkX, lineY, {
      width: doc.widthOfString(link.label) + 4,
      link: link.url,
      underline: true,
    });
    linkX += doc.widthOfString(link.label);
  });

  doc.fillColor('#111827');
}

function drawCenteredHeader(doc, profile, fullName, contactParts, profileLinks) {
  doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(fullName, { align: 'center' });
  doc.moveDown(0.35);

  if (text(profile.professionalTitle)) {
    doc.font('Helvetica').fontSize(13).fillColor('#334155').text(text(profile.professionalTitle), {
      align: 'center',
    });
    doc.moveDown(0.5);
  }

  if (contactParts.length) {
    doc.fontSize(10).fillColor('#64748b').text(contactParts.join('  •  '), { align: 'center' });
    doc.moveDown(profileLinks.length ? 0.25 : 0.6);
  }

  if (profileLinks.length) {
    drawProfileLinks(doc, profileLinks, { centered: true, fontSize: 9 });
    doc.moveDown(0.5);
  } else if (!contactParts.length) {
    doc.moveDown(0.6);
  }
}

function drawHeaderWithPhoto(doc, profile, fullName, contactParts, profileLinks, avatarPath) {
  const margin = doc.page.margins.left;
  const photoSize = HEADER_PHOTO_SIZE;
  const headerY = doc.y;
  const textX = margin + photoSize + 18;
  const textWidth = doc.page.width - doc.page.margins.right - textX;

  drawCircularImage(doc, avatarPath, margin, headerY, photoSize);

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#0f172a');
  doc.text(fullName, textX, headerY, { width: textWidth, lineGap: 2 });

  let blockY = doc.y + 4;
  if (text(profile.professionalTitle)) {
    doc.font('Helvetica').fontSize(12).fillColor('#334155');
    doc.text(text(profile.professionalTitle), textX, blockY, { width: textWidth });
    blockY = doc.y + 4;
  }

  if (contactParts.length) {
    doc.font('Helvetica').fontSize(9).fillColor('#64748b');
    doc.text(contactParts.join('  •  '), textX, blockY, { width: textWidth });
    blockY = doc.y + 4;
  }

  if (profileLinks.length) {
    drawProfileLinks(doc, profileLinks, { textX, textWidth, fontSize: 9, y: blockY });
    blockY = Math.max(blockY, doc.y);
  }

  const headerBottom = Math.max(doc.y, headerY + photoSize, blockY);
  doc.y = headerBottom + 14;
  doc.x = margin;
}

function drawProfileHeader(doc, profile, fullName, contactParts, profileLinks) {
  const avatarPath = resolveAvatarPath(profile.avatarUrl);

  if (avatarPath) {
    try {
      drawHeaderWithPhoto(doc, profile, fullName, contactParts, profileLinks, avatarPath);
      return;
    } catch {
      doc.y = doc.page.margins.top;
      doc.x = doc.page.margins.left;
    }
  }

  drawCenteredHeader(doc, profile, fullName, contactParts, profileLinks);
}

async function generateResumePdfFile(profile) {
  if (!hasProfileContent(profile)) {
    throw ApiError.badRequest(
      'Profil incomplet : renseignez au minimum prénom, nom, et titre, compétences ou expériences.'
    );
  }

  await ensureResumeDirectory();
  const filename = `${generateUuid()}.pdf`;
  const filePath = path.join(getResumeDirectory(), filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);

    doc.pipe(stream);

    const fullName = `${text(profile.firstName)} ${text(profile.lastName)}`.trim();

    const contactParts = [];
    if (text(profile.phone)) contactParts.push(text(profile.phone));
    if (text(profile.email)) contactParts.push(text(profile.email));
    const profileLinks = getProfileLinks(profile);

    drawProfileHeader(doc, profile, fullName, contactParts, profileLinks);

    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    // Ordre CV : Résumé → Formation → Expérience → Compétences → Langues
    if (hasMultilineText(profile.bio)) {
      writeSectionTitle(doc, 'Résumé');
      writeWrapped(doc, profile.bio, { size: 10 });
    }

    const education = Array.isArray(profile.education) ? profile.education : [];
    const validEdu = education.filter((e) => text(e.degree) || text(e.institution));
    if (validEdu.length) {
      writeSectionTitle(doc, 'Formation');
      validEdu.forEach((edu, index) => {
        if (index > 0) doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).text(text(edu.degree) || 'Diplôme');
        const meta = [
          text(edu.institution),
          text(edu.city),
          formatPeriod(edu.startDate, edu.endDate),
        ].filter(Boolean);
        if (meta.length) {
          doc.font('Helvetica').fontSize(9).fillColor('#475569').text(meta.join(' — '));
          doc.fillColor('#111827');
        }
      });
    }

    const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
    const validExp = experiences.filter((e) => text(e.title) || text(e.company));
    if (validExp.length) {
      writeSectionTitle(doc, 'Expérience');
      validExp.forEach((exp, index) => {
        if (index > 0) doc.moveDown(0.35);
        doc.font('Helvetica-Bold').fontSize(11).text(text(exp.title) || 'Poste');
        const meta = [
          text(exp.company),
          text(exp.city),
          formatPeriod(exp.startDate, exp.current ? 'Présent' : exp.endDate),
        ].filter(Boolean);
        if (meta.length) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(meta.join(' — '));
          doc.fillColor('#111827');
        }
        if (hasMultilineText(exp.description)) {
          doc.moveDown(0.15);
          writeWrapped(doc, exp.description, { size: 9, lineGap: 2 });
        }
      });
    }

    const skills = Array.isArray(profile.skills) ? profile.skills.filter((s) => text(s)) : [];
    if (skills.length) {
      writeSectionTitle(doc, 'Compétences');
      doc.font('Helvetica').fontSize(10).text(skills.map((s) => text(s)).join('  •  '));
    }

    const languages = Array.isArray(profile.languages) ? profile.languages.filter((l) => text(l)) : [];
    if (languages.length) {
      writeSectionTitle(doc, 'Langues');
      doc.font('Helvetica').fontSize(10).text(languages.map((l) => text(l)).join('  •  '));
    }

    const certifications = Array.isArray(profile.certifications)
      ? profile.certifications.filter((c) => text(c))
      : [];
    if (certifications.length) {
      writeSectionTitle(doc, 'Certifications');
      doc.font('Helvetica').fontSize(10).text(certifications.map((c) => text(c)).join('  •  '));
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor('#94a3b8').text('CV généré via Job Board', { align: 'right' });

    doc.end();
  });

  return {
    filename,
    filePath,
    resumeUrl: buildResumePublicUrl(filename),
  };
}

module.exports = {
  generateResumePdfFile,
  hasProfileContent,
};
