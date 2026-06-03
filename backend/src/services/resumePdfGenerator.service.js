'use strict';

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { generateUuid } = require('../utils/uuid');
const {
  ensureResumeDirectory,
  getResumeDirectory,
  buildResumePublicUrl,
} = require('../utils/fileStorage');
const ApiError = require('../utils/ApiError');

function text(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
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
  const value = text(content);
  if (!value) return;
  doc.fontSize(options.size || 10).text(value, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: options.align || 'left',
  });
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

    doc.font('Helvetica-Bold').fontSize(22).fillColor('#0f172a').text(fullName, { align: 'center' });
    doc.moveDown(0.35);

    if (text(profile.professionalTitle)) {
      doc.font('Helvetica').fontSize(13).fillColor('#334155').text(text(profile.professionalTitle), {
        align: 'center',
      });
      doc.moveDown(0.5);
    }

    const contactParts = [];
    if (text(profile.phone)) contactParts.push(text(profile.phone));
    if (text(profile.email)) contactParts.push(text(profile.email));
    if (contactParts.length) {
      doc.fontSize(10).fillColor('#64748b').text(contactParts.join('  •  '), { align: 'center' });
      doc.moveDown(0.6);
    }

    doc.strokeColor('#e2e8f0').lineWidth(1);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.5);

    if (text(profile.bio)) {
      writeSectionTitle(doc, 'Profil');
      doc.font('Helvetica').fontSize(10);
      writeWrapped(doc, profile.bio);
    }

    const skills = Array.isArray(profile.skills) ? profile.skills.filter((s) => text(s)) : [];
    if (skills.length) {
      writeSectionTitle(doc, 'Compétences');
      doc.font('Helvetica').fontSize(10).text(skills.map((s) => text(s)).join('  •  '));
    }

    const experiences = Array.isArray(profile.experiences) ? profile.experiences : [];
    const validExp = experiences.filter((e) => text(e.title) || text(e.company));
    if (validExp.length) {
      writeSectionTitle(doc, 'Expérience professionnelle');
      validExp.forEach((exp, index) => {
        if (index > 0) doc.moveDown(0.35);
        doc.font('Helvetica-Bold').fontSize(11).text(text(exp.title) || 'Poste');
        const meta = [text(exp.company), formatPeriod(exp.startDate, exp.endDate)].filter(Boolean);
        if (meta.length) {
          doc.font('Helvetica-Oblique').fontSize(9).fillColor('#475569').text(meta.join(' — '));
          doc.fillColor('#111827');
        }
        if (text(exp.description)) {
          doc.moveDown(0.15);
          doc.font('Helvetica').fontSize(9);
          writeWrapped(doc, exp.description);
        }
      });
    }

    const education = Array.isArray(profile.education) ? profile.education : [];
    const validEdu = education.filter((e) => text(e.degree) || text(e.institution));
    if (validEdu.length) {
      writeSectionTitle(doc, 'Formation');
      validEdu.forEach((edu, index) => {
        if (index > 0) doc.moveDown(0.3);
        doc.font('Helvetica-Bold').fontSize(11).text(text(edu.degree) || 'Diplôme');
        const meta = [text(edu.institution), formatPeriod(edu.startDate, edu.endDate)].filter(Boolean);
        if (meta.length) {
          doc.font('Helvetica').fontSize(9).fillColor('#475569').text(meta.join(' — '));
          doc.fillColor('#111827');
        }
      });
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
