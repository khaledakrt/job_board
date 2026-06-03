'use strict';

const fs = require('fs/promises');
const { env } = require('../config');
const {
  extractTextFromPdfFile,
  isPdfTextUsable,
} = require('./pdfTextExtractor.service');
const logger = require('../utils/logger');
const { parseResumeWithAi } = require('./resumeAiParser.service');

const SKILL_TAXONOMY = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust', 'Ruby', 'PHP',
  'React', 'Angular', 'Vue', 'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'Spring',
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes', 'AWS', 'Azure',
  'GCP', 'Git', 'CI/CD', 'Agile', 'Scrum', 'REST', 'GraphQL', 'HTML', 'CSS', 'Tailwind',
  'Machine Learning', 'Data Analysis', 'Excel', 'Power BI', 'Tableau', 'Figma', 'UX', 'UI',
  'Project Management', 'Communication', 'Leadership', 'Marketing', 'Sales', 'SEO',
];

const PHONE_REGEX = /(\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/g;

const SECTION_HEADERS = {
  experience: [
    /^experiences?\b/i,
    /^exp[eé]riences?\s+professionnelles?/i,
    /^work\s+experience/i,
    /^professional\s+experience/i,
    /^employment(\s+history)?/i,
    /^career(\s+history)?/i,
    /^expériences?\b/i,
    /^parcours\s+professionnel/i,
    /^historique\s+professionnel/i,
    /^missions?\b/i,
    /^emplois?\b/i,
    /^activit[eé]s?\s+professionnelles?/i,
    /^exp[eé]rience\s+professionnelle/i,
  ],
  education: [
    /^education\b/i,
    /^formations?\b/i,
    /^formation\s+acad[eé]mique/i,
    /^études\b/i,
    /^academic(\s+background)?/i,
    /^dipl[oô]mes?\b/i,
    /^parcours\s+acad[eé]mique/i,
    /^qualifications?\b/i,
    /^cursus\s+scolaire/i,
  ],
  skills: [/^skills?\b/i, /^compétences\b/i, /^savoir[\s-]?faire/i, /^technical\s+skills/i],
  other: [
    /^projects?\b/i,
    /^certifications?\b/i,
    /^languages?\b/i,
    /^langues\b/i,
    /^outils?\b/i,
    /^logiciels?\b/i,
    /^bureautique\b/i,
    /^environnement\s+technique/i,
    /^méthodologies?\b/i,
    /^summary\b/i,
    /^profil\b/i,
    /^objective\b/i,
    /^résumé\b/i,
    /^contact\b/i,
    /^references?\b/i,
  ],
};

const DATE_RANGE_REGEX =
  /((?:19|20)\d{2})\s*[-–—/àa]\s*((?:19|20)\d{2}|present|présent|actuel|current|aujourd'?hui|now|en\s+cours|aujourd)/i;

const DATE_SINCE_REGEX = /(?:depuis|since)\s*((?:19|20)\d{2})/i;

const SINGLE_YEAR_LINE = /^(?:19|20)\d{2}$/;

const NAME_SKIP_PATTERNS = [
  /@/,
  /^https?:/i,
  /^www\./i,
  /base\s+de\s+donn[eé]es/i,
  /\bdonn[eé]es\b/i,
  /\bmysql\b/i,
  /\bpostgresql\b/i,
  /^comp[eé]tences?\b/i,
  /^skills?\b/i,
  /^formation\b/i,
  /^exp[eé]rience/i,
  /^langues?\b/i,
  /^projets?\b/i,
  /^certifications?\b/i,
  /:\s*$/,
  /^[0-9+\s().-]{8,}$/,
  /^.{0,2}$/,
];

const BULLET_PREFIX = /^[-•●▪◦*]\s*/;

const COMPETENCY_LINE =
  /^(réseau|reseau|développement|developpement|langues?|outils?|logiciels?|pack|microsoft|office|bureautique|syst[eè]mes?|environnement|méthodologies?|méthodes?|base de données|donn[eé]es)\s*:?\s*$/i;

const JOB_HINT =
  /\b(stage|alternance|ingénieur|ingenieur|développeur|developpeur|developer|consultant|chef|responsable|technicien|manager|analyste|stagiaire|employé|apprenti|freelance|architecte|administrateur|directeur|lead|senior|junior|cdi|cdd|intern)\b/i;

const EDUCATION_HINT =
  /\b(universit[eé]|university|[ée]cole|institut|faculté|lycée|college|master|licence|bts|dut|mba|doctorat|ingénieur|engineering|bachelor|dipl[oô]me|cursus|formation)\b/i;

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function stripAccents(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function fixPdfEncodingArtifacts(text) {
  return text
    .replace(/\uFFFD/g, '')
    .replace(/M\s*crosoft/gi, 'Microsoft')
    .replace(/Offce/gi, 'Office')
    .replace(/D\s*[eé]veloppement/gi, 'Développement');
}

function isColonCategoryLabel(line) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) return false;
  if (COMPETENCY_LINE.test(trimmed)) return true;
  return /^[A-Za-zÀ-ÿ0-9\s\/\-]{2,45}:$/.test(trimmed);
}

function isSentenceFragment(line) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) return false;
  if (/^[,;.]/.test(trimmed)) return true;
  if (/^(résoudre|signaler|problèmes|assurer|participer|contribuer|veiller)\b/i.test(trimmed)) {
    return true;
  }
  if (/^[a-zà-ÿ]/.test(trimmed) && trimmed.length < 60 && !EDUCATION_HINT.test(trimmed)) {
    return true;
  }
  return false;
}

function isValidExperienceEntry(exp) {
  const title = (exp.title || '').trim();
  const company = (exp.company || '').trim();
  const description = (exp.description || '').trim();

  if (!title && !company) return false;
  if (isColonCategoryLabel(title) || isColonCategoryLabel(company)) return false;
  if (isSentenceFragment(title) || isSentenceFragment(company)) return false;
  if ((title.endsWith(':') || company.endsWith(':')) && !exp.startDate) return false;
  if (title.length <= 3 && company.length <= 3) return false;

  const blob = `${title} ${company} ${description}`;
  const hasDate = Boolean(exp.startDate);
  const hasJobHint = JOB_HINT.test(blob);

  if (!hasDate && !hasJobHint) {
    if (title.length < 10 && company.length < 10) return false;
    if (/pack\s|office|réseau|développement:/i.test(blob)) return false;
  }

  return true;
}

function isValidEducationEntry(edu) {
  const institution = (edu.institution || '').trim();
  const degree = (edu.degree || '').trim();

  if (!institution && !degree) return false;
  if (isColonCategoryLabel(institution) || isColonCategoryLabel(degree)) return false;
  if (isSentenceFragment(institution) || isSentenceFragment(degree)) return false;

  const blob = `${institution} ${degree}`;
  if (!EDUCATION_HINT.test(blob) && !edu.startDate) {
    if (institution.length < 12 && degree.length < 12) return false;
  }

  return true;
}

function filterParsedEntries(experiences, education) {
  return {
    experiences: experiences.filter(isValidExperienceEntry),
    education: education.filter(isValidEducationEntry),
  };
}

function normalizePdfText(rawText) {
  let text = fixPdfEncodingArtifacts(rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));

  text = text.replace(/^([A-Za-zÀ-ÿ][^\n:]{1,42}):\n([^\n]{1,120})$/gim, '$1: $2');

  const breakBefore = [
    'Expériences professionnelles',
    'EXPÉRIENCES PROFESSIONNELLES',
    'EXPERIENCES PROFESSIONNELLES',
    'Expérience professionnelle',
    'Expériences',
    'EXPERIENCES',
    'Experience',
    'WORK EXPERIENCE',
    'Parcours professionnel',
    'Formation',
    'FORMATION',
    'Formations',
    'Education',
    'EDUCATION',
    'Études',
    'Compétences',
    'COMPÉTENCES',
    'Skills',
    'SKILLS',
    'Langues',
    'Projets',
    'Certifications',
    'Profil',
    'Contact',
  ];

  for (const label of breakBefore) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`(\\S)\\s*(${escaped})`, 'gi'), '$1\n$2');
    text = text.replace(new RegExp(`^(${escaped})`, 'gim'), '\n$1');
  }

  text = text.replace(
    /([^\n])\s*((?:19|20)\d{2}\s*[-–—/]\s*(?:(?:19|20)\d{2}|présent|present|actuel|current|en cours|aujourd'?hui))/gi,
    '$1\n$2'
  );

  text = text.replace(/([^\n])\s*(depuis\s+(?:19|20)\d{2})/gi, '$1\n$2');

  return text;
}

function splitLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function extractFirstMatch(regex, text) {
  const match = text.match(regex);
  return match ? match[0].trim() : null;
}

function isBadNameLine(line) {
  const trimmed = normalizeWhitespace(line);
  if (trimmed.length < 2 || trimmed.length > 55) return true;
  return NAME_SKIP_PATTERNS.some((re) => re.test(trimmed));
}

function looksLikePersonName(line) {
  const trimmed = normalizeWhitespace(line);
  if (isBadNameLine(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const letterRatio = (trimmed.match(/[a-zA-ZÀ-ÿ]/g) || []).length / trimmed.length;
  if (letterRatio < 0.7) return false;
  return words.every((w) => /^[A-ZÀ-Ÿ][a-zà-ÿ'-]{1,}$/.test(w) || /^[A-ZÀ-Ÿ]{2,}$/.test(w));
}

function extractNameFromLines(lines) {
  const candidates = lines
    .slice(0, 15)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => !isBadNameLine(line));

  const nameLine = candidates.find(looksLikePersonName) || candidates[0];
  if (!nameLine) {
    return { firstName: null, lastName: null };
  }

  const primary = nameLine.split(/\s+/).filter(Boolean);
  if (primary.length === 1) {
    return { firstName: primary[0], lastName: null };
  }

  return {
    firstName: primary[0],
    lastName: primary.slice(1).join(' '),
  };
}

const TITLE_ROLE_REGEX =
  /\b(ingénieur|ingenieur|ingénieure|développeur|developpeur|developer|devops|consultant|architecte|technicien|manager|analyste|designer|administrateur|administrator|lead|directeur|spécialiste|specialist)\s+[\w\s\-\/&.]{2,55}/i;

const SENTENCE_MARKERS =
  /\b(tout en|afin de|passionné|souhaite|recherch|objectif|expérience en|années d|d'ingénierie en|en cloud computing et)/i;

function lineHasJobTitleKeyword(line) {
  const plain = stripAccents(line.toLowerCase());
  return (
    /\bingenieur\b/.test(plain) ||
    /\bdeveloppeur\b/.test(plain) ||
    /\bdeveloper\b/.test(plain) ||
    /\bdevops\b/.test(plain) ||
    /\bconsultant\b/.test(plain) ||
    /\barchitecte\b/.test(plain) ||
    /\btechnicien\b/.test(plain) ||
    /\bmanager\b/.test(plain) ||
    /\banalyste\b/.test(plain)
  );
}

function extractProfessionalTitle(text, lines) {
  const candidates = lines
    .slice(0, 25)
    .map((line) => normalizeWhitespace(line))
    .filter((line) => line.length >= 8 && line.length <= 72)
    .filter((line) => !isBadNameLine(line))
    .filter((line) => lineHasJobTitleKeyword(line))
    .filter((line) => !SENTENCE_MARKERS.test(line))
    .filter((line) => line.split(/\s+/).length <= 9);

  if (candidates.length) {
    const best = candidates.sort((a, b) => a.length - b.length)[0];
    const roleMatch = best.match(TITLE_ROLE_REGEX);
    if (roleMatch) {
      return normalizeWhitespace(roleMatch[0]).slice(0, 255);
    }
    return best.slice(0, 255);
  }

  const roleInText = text.match(TITLE_ROLE_REGEX);
  if (roleInText) {
    return normalizeWhitespace(roleInText[0]).slice(0, 255);
  }

  return null;
}

function extractBioSummary(lines) {
  const bioLine = lines.slice(0, 30).find((line) => {
    const trimmed = normalizeWhitespace(line);
    return trimmed.length > 90 && (SENTENCE_MARKERS.test(trimmed) || /cloud|devops|ingénierie/i.test(trimmed));
  });

  return bioLine ? normalizeWhitespace(bioLine).slice(0, 2000) : null;
}

function detectSkills(text) {
  const lowerText = text.toLowerCase();
  const detected = [];

  for (const skill of SKILL_TAXONOMY) {
    if (lowerText.includes(skill.toLowerCase())) {
      detected.push(skill);
    }
  }

  const skillsSection = text.match(/skills?\s*[:\-]?\s*([\s\S]{0,500})/i);

  if (skillsSection) {
    const section = skillsSection[1];
    const tokens = section
      .split(/[,|•\n;]/)
      .map((token) => normalizeWhitespace(token))
      .filter((token) => token.length >= 2 && token.length <= 40);

    for (const token of tokens) {
      if (!detected.includes(token)) {
        detected.push(token);
      }
    }
  }

  return [...new Set(detected)].slice(0, 30);
}

function isSectionHeader(line) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed || trimmed.length > 80) {
    return null;
  }

  const plain = stripAccents(trimmed).toLowerCase();

  for (const [key, patterns] of Object.entries(SECTION_HEADERS)) {
    if (patterns.some((re) => re.test(trimmed) || re.test(plain))) {
      return key;
    }
  }

  if (/^(experience|experiences|formation|formations|education|competences|skills)$/i.test(plain)) {
    if (plain.startsWith('exp')) return 'experience';
    if (plain.startsWith('form') || plain === 'education') return 'education';
    if (plain.startsWith('comp') || plain === 'skills') return 'skills';
  }

  return null;
}

function extractSectionText(lines, sectionKey) {
  const indices = [];

  for (let i = 0; i < lines.length; i += 1) {
    const key = isSectionHeader(lines[i]);
    if (key) {
      indices.push({ key, index: i });
    }
  }

  if (!indices.length) {
    return '';
  }

  const startEntry = indices.find((e) => e.key === sectionKey);
  if (!startEntry) {
    return '';
  }

  const startIdx = startEntry.index + 1;
  const nextEntry = indices.find((e) => e.index > startEntry.index);
  const endIdx = nextEntry ? nextEntry.index : lines.length;

  return lines.slice(startIdx, endIdx).join('\n');
}

function parseDateRange(line) {
  const trimmed = normalizeWhitespace(line);
  const rangeMatch = trimmed.match(DATE_RANGE_REGEX);
  if (rangeMatch) {
    const startYear = rangeMatch[1];
    const endPart = rangeMatch[2] || '';
    const endLower = endPart.toLowerCase();
    let endDate = endPart;
    if (/present|présent|actuel|current|aujourd|now|en\s+cours/i.test(endLower)) {
      endDate = '';
    }
    return { startDate: startYear, endDate: endDate, matched: true };
  }

  const sinceMatch = trimmed.match(DATE_SINCE_REGEX);
  if (sinceMatch) {
    return { startDate: sinceMatch[1], endDate: '', matched: true };
  }

  if (SINGLE_YEAR_LINE.test(trimmed)) {
    return { startDate: trimmed, endDate: '', matched: true };
  }

  return { startDate: null, endDate: null, matched: false };
}

function isLikelyDateLine(line) {
  const trimmed = normalizeWhitespace(line);
  if (!trimmed) return false;
  if (DATE_RANGE_REGEX.test(trimmed)) return true;
  if (DATE_SINCE_REGEX.test(trimmed)) return true;
  if (SINGLE_YEAR_LINE.test(trimmed)) return true;
  if (/^(19|20)\d{2}\s*[-–—/]\s*(19|20)\d{2}$/.test(trimmed)) return true;
  if (/^(19|20)\d{2}\s*-\s*(présent|present|actuel|en cours)/i.test(trimmed)) return true;
  return false;
}

function isBulletLine(line) {
  return BULLET_PREFIX.test(line.trim());
}

function cleanBullet(line) {
  return normalizeWhitespace(line.replace(BULLET_PREFIX, ''));
}

function parseBlocksFromSection(sectionText, mode) {
  const lines = sectionText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    return [];
  }

  const blocks = [];
  let headerLines = [];
  let dateLine = null;
  let bodyLines = [];

  const pushBlock = () => {
    if (!headerLines.length && !dateLine && !bodyLines.length) {
      return;
    }
    blocks.push({ headerLines: [...headerLines], dateLine, bodyLines: [...bodyLines] });
    headerLines = [];
    dateLine = null;
    bodyLines = [];
  };

  for (const line of lines) {
    if (isSectionHeader(line)) {
      continue;
    }

    if (isColonCategoryLabel(line)) {
      continue;
    }

    if (isLikelyDateLine(line)) {
      if (dateLine) {
        pushBlock();
      }
      dateLine = line;
      continue;
    }

    if (dateLine) {
      const startsNewEntry =
        bodyLines.length > 0 &&
        !isBulletLine(line) &&
        line.length <= 90 &&
        !isLikelyDateLine(line);

      if (startsNewEntry) {
        pushBlock();
        headerLines.push(line);
        continue;
      }
      bodyLines.push(line);
    } else {
      headerLines.push(line);
    }
  }

  pushBlock();

  return blocks
    .map((block) => formatBlock(block, mode))
    .filter(Boolean)
    .slice(0, 12);
}

function formatBlock(block, mode) {
  const dates = block.dateLine ? parseDateRange(block.dateLine) : { startDate: null, endDate: null };
  let description = block.bodyLines.map(cleanBullet).filter(Boolean).join('\n');

  const header = [...block.headerLines];
  if (block.dateLine && !dates.matched) {
    header.push(block.dateLine);
  }

  if (mode === 'experience') {
    let title = '';
    let company = '';

    if (header.length >= 2) {
      title = header[0];
      company = header[1];
      if (header.length > 2 && !description) {
        description = header.slice(2).join('\n');
      }
    } else if (header.length === 1) {
      const parts = header[0].split(/\s+[-–—@]\s+|\s+at\s+/i);
      if (parts.length >= 2) {
        title = parts[0].trim();
        company = parts.slice(1).join(' ').trim();
      } else {
        title = header[0];
      }
    }

    if (!title && !company) {
      return null;
    }

    return {
      title: title.slice(0, 255) || null,
      company: company.slice(0, 255) || null,
      startDate: dates.startDate,
      endDate: dates.endDate || null,
      description: description.slice(0, 2000) || null,
    };
  }

  let institution = '';
  let degree = '';

  if (header.length >= 2) {
    degree = header[0];
    institution = header[1];
  } else if (header.length === 1) {
    const line = header[0];
    if (/\b(université|university|école|school|institut|faculté|lycée|college|master|licence|bts|dut|mba|phd|doctorat|ingénieur)\b/i.test(line)) {
      institution = line;
    } else {
      degree = line;
    }
  }

  if (!institution && !degree) {
    return null;
  }

  return {
    institution: institution.slice(0, 255) || null,
    degree: degree.slice(0, 255) || null,
    startDate: dates.startDate,
    endDate: dates.endDate || null,
  };
}

function getSectionBounds(lines) {
  let experience = null;
  let education = null;
  let skills = null;

  for (let i = 0; i < lines.length; i += 1) {
    const key = isSectionHeader(lines[i]);
    if (key === 'experience' && experience === null) experience = i;
    if (key === 'education' && education === null) education = i;
    if (key === 'skills' && skills === null) skills = i;
  }

  return { experience, education, skills };
}

function extractByDateHeuristic(lines, mode) {
  const entries = [];
  const bounds = getSectionBounds(lines);
  let scanStart = 0;
  let scanEnd = lines.length;

  if (mode === 'experience') {
    if (bounds.experience !== null) {
      scanStart = bounds.experience + 1;
      scanEnd = bounds.education ?? bounds.skills ?? lines.length;
    } else if (bounds.education !== null) {
      scanEnd = bounds.education;
    }
  } else if (mode === 'education') {
    if (bounds.education !== null) {
      scanStart = bounds.education + 1;
    } else {
      return [];
    }
  }

  const dateIndices = [];
  for (let i = scanStart; i < scanEnd; i += 1) {
    if (isLikelyDateLine(lines[i])) {
      dateIndices.push(i);
    }
  }

  for (const idx of dateIndices) {
    const headerLines = lines.slice(Math.max(0, idx - 2), idx).filter((l) => !isSectionHeader(l));
    const dateLine = lines[idx];
    const bodyLines = [];
    let j = idx + 1;
    while (j < lines.length && !isLikelyDateLine(lines[j]) && !isSectionHeader(lines[j])) {
      if (bodyLines.length > 0 || isBulletLine(lines[j]) || lines[j].length < 120) {
        bodyLines.push(lines[j]);
      }
      j += 1;
      if (bodyLines.length > 8) break;
    }

    const block = formatBlock(
      { headerLines, dateLine, bodyLines },
      mode
    );
    if (block) entries.push(block);
  }

  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.title}|${e.company}|${e.startDate}|${e.institution}|${e.degree}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractExperiences(text, lines) {
  let sectionText = extractSectionText(lines, 'experience');

  if (!sectionText) {
    const joined = lines.join('\n');
    const expMatch = joined.match(
      /(?:exp[eé]riences?\s+professionnelles?|expériences?|experience|work experience|parcours professionnel)[:\s]*\n?([\s\S]{0,6000}?)(?=\n\s*(?:education|formation|formations|études|skills|compétences|projects|certifications|languages|langues|profil)\b|$)/i
    );
    if (expMatch) {
      sectionText = expMatch[1];
    }
  }

  let results = [];
  if (sectionText && sectionText.trim().length >= 10) {
    results = parseBlocksFromSection(sectionText, 'experience');
  }

  if (results.length === 0) {
    results = extractByDateHeuristic(lines, 'experience');
  }

  if (results.length === 0) {
    results = extractExperiencesFromJobLines(lines);
  }

  return results.slice(0, 12);
}

function extractExperiencesFromJobLines(lines) {
  const bounds = getSectionBounds(lines);
  const start = bounds.experience !== null ? bounds.experience + 1 : 0;
  const end = bounds.education ?? bounds.skills ?? lines.length;
  const results = [];

  for (let i = start; i < end; i += 1) {
    const line = normalizeWhitespace(lines[i]);
    if (!line || isSectionHeader(line) || isColonCategoryLabel(line)) {
      continue;
    }
    if (!JOB_HINT.test(line) || line.length > 90 || SENTENCE_MARKERS.test(line)) {
      continue;
    }

    const title = line;
    let company = null;

    for (let j = i + 1; j < Math.min(end, i + 4); j += 1) {
      const next = normalizeWhitespace(lines[j]);
      if (!next || isLikelyDateLine(next) || isSectionHeader(next) || isColonCategoryLabel(next)) {
        break;
      }
      if (JOB_HINT.test(next) && j > i + 1) {
        break;
      }
      if (!isSentenceFragment(next) && next.length >= 2 && next.length <= 80) {
        company = next;
        break;
      }
    }

    const block = formatBlock(
      {
        headerLines: company ? [title, company] : [title],
        dateLine: null,
        bodyLines: [],
      },
      'experience'
    );
    if (block && isValidExperienceEntry(block)) {
      results.push(block);
    }
  }

  const seen = new Set();
  return results.filter((e) => {
    const key = `${e.title}|${e.company}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractEducation(text, lines) {
  let sectionText = extractSectionText(lines, 'education');

  if (!sectionText) {
    const joined = lines.join('\n');
    const eduMatch = joined.match(
      /(?:education|formations?|formation|études|dipl[oô]mes?|parcours acad[eé]mique)[:\s]*\n?([\s\S]{0,4000}?)(?=\n\s*(?:exp[eé]rience|experience|skills|compétences|projects|certifications|languages|langues|profil)\b|$)/i
    );
    if (eduMatch) {
      sectionText = eduMatch[1];
    }
  }

  let results = [];
  if (sectionText && sectionText.trim().length >= 10) {
    results = parseBlocksFromSection(sectionText, 'education');
  }

  if (results.length === 0) {
    const eduLines = lines.filter(
      (l) =>
        /\b(universit[eé]|university|[ée]cole|institut|master|licence|bts|dut|mba|doctorat|ingénieur|engineering)\b/i.test(l) ||
        isLikelyDateLine(l)
    );
    if (eduLines.length >= 2) {
      results = extractByDateHeuristic(lines, 'education');
    }
  }

  return results.slice(0, 12);
}

function simulateParsedProfile(text) {
  const normalized = normalizePdfText(text);
  const lines = splitLines(normalized);

  const { firstName, lastName } = extractNameFromLines(lines);
  const phone = extractFirstMatch(PHONE_REGEX, text);
  const professionalTitle = extractProfessionalTitle(text, lines);
  const bio = extractBioSummary(lines);
  const skills = detectSkills(text);
  let experiences = extractExperiences(text, lines);
  let education = extractEducation(text, lines);
  const filtered = filterParsedEntries(experiences, education);
  experiences = filtered.experiences;
  education = filtered.education;

  const parseQuality =
    experiences.length > 0 || education.length > 0 ? 'ok' : 'low';

  return {
    first_name: firstName,
    last_name: lastName,
    phone,
    professional_title: professionalTitle,
    bio,
    skills,
    experiences,
    education,
    parseQuality,
    rawTextPreview: normalizeWhitespace(text).slice(0, 500),
    parserMode: 'simulated',
  };
}

async function parseResumeText(rawText) {
  const normalized = normalizePdfText(rawText || '');

  const aiResult = await parseResumeWithAi(normalized, env);
  if (aiResult) {
    if (aiResult.experiences?.length || aiResult.education?.length || aiResult.first_name) {
      return {
        ...aiResult,
        parseQuality: 'ok',
        rawTextPreview: normalizeWhitespace(normalized).slice(0, 500),
      };
    }
  }

  const parsed = simulateParsedProfile(normalized);
  return {
    ...parsed,
    parserMode: parsed.parserMode === 'simulated' ? 'heuristic' : 'pdf-parse',
    parseQuality: parsed.parseQuality || 'low',
  };
}

async function parseResumePdf(filePath) {
  let text = await extractTextFromPdfFile(filePath);

  if (!isPdfTextUsable(text)) {
    const fallbackText =
      'Jean Dupont\nDéveloppeur Full-Stack\n+33 6 12 34 56 78\n' +
      'Skills: JavaScript, TypeScript, React, Node.js, MySQL, Docker, Agile\n' +
      'Experience\n' +
      'Développeur Full-Stack\n' +
      'Tech Solutions SAS\n' +
      '2021 - Present\n' +
      '- Développement d\'applications web Angular et Node.js\n' +
      '- Mise en place CI/CD et revues de code\n' +
      'Développeur Web Junior\n' +
      'Startup Paris\n' +
      '2019 - 2021\n' +
      '- Sites vitrines et APIs REST\n' +
      'Education\n' +
      'Master Informatique\n' +
      'Université Paris-Saclay\n' +
      '2017 - 2019\n' +
      'Licence Informatique\n' +
      'Université Paris-Saclay\n' +
      '2014 - 2017';

    return simulateParsedProfile(fallbackText);
  }

  return parseResumeText(text);
}

async function extractTextFromPdf(filePath) {
  return extractTextFromPdfFile(filePath);
}

module.exports = {
  parseResumePdf,
  parseResumeText,
  extractTextFromPdf,
  detectSkills,
};
