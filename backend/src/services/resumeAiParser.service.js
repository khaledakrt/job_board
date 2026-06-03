'use strict';

const logger = require('../utils/logger');
const { resolveCvLlmProvider } = require('../config/cvLlm');

const SYSTEM_PROMPT = `Tu es un expert RH. On te donne le texte brut extrait d'un CV (PDF).
Extrais les informations en JSON strict, sans markdown ni commentaire.

Règles:
- firstName / lastName: vrai nom de la personne, PAS "Base de données", PAS un titre de section
- professionalTitle: poste actuel ou cible (ex. Ingénieur DevOps)
- phone: numéro tel complet si présent
- skills: liste de compétences techniques (max 25)
- experiences: tous les postes professionnels, du plus récent au plus ancien
- education: diplômes et formations
- Dates au format YYYY ou YYYY-MM; endDate vide si poste actuel
- description: missions en texte (puces regroupées)

Réponds UNIQUEMENT avec ce JSON:
{
  "firstName": string|null,
  "lastName": string|null,
  "phone": string|null,
  "professionalTitle": string|null,
  "bio": string|null,
  "skills": string[],
  "experiences": [
    { "title": string, "company": string, "startDate": string, "endDate": string, "description": string }
  ],
  "education": [
    { "institution": string, "degree": string, "startDate": string, "endDate": string }
  ]
}`;

function cleanParsedText(value) {
  return String(value || '')
    .replace(/\uFFFD/g, '')
    .replace(/M\s*crosoft/gi, 'Microsoft')
    .replace(/Offce/gi, 'Office')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAiPayload(raw, parserMode) {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const experiences = Array.isArray(raw.experiences)
    ? raw.experiences
        .map((e) => ({
          title: cleanParsedText(e.title) || null,
          company: cleanParsedText(e.company) || null,
          startDate: cleanParsedText(e.startDate) || null,
          endDate: cleanParsedText(e.endDate) || null,
          description: cleanParsedText(e.description) || null,
        }))
        .filter((e) => e.title || e.company)
    : [];

  const education = Array.isArray(raw.education)
    ? raw.education
        .map((e) => ({
          institution: cleanParsedText(e.institution) || null,
          degree: cleanParsedText(e.degree) || null,
          startDate: cleanParsedText(e.startDate) || null,
          endDate: cleanParsedText(e.endDate) || null,
        }))
        .filter((e) => e.institution || e.degree)
    : [];

  const skills = Array.isArray(raw.skills)
    ? [...new Set(raw.skills.map((s) => cleanParsedText(s)).filter((s) => s.length >= 2 && s.length <= 50))]
    : [];

  return {
    first_name: raw.firstName ? cleanParsedText(raw.firstName) : null,
    last_name: raw.lastName ? cleanParsedText(raw.lastName) : null,
    phone: raw.phone ? cleanParsedText(raw.phone) : null,
    professional_title: raw.professionalTitle ? cleanParsedText(raw.professionalTitle) : null,
    bio: raw.bio ? cleanParsedText(raw.bio) : null,
    skills: skills.slice(0, 30),
    experiences: experiences.slice(0, 15),
    education: education.slice(0, 10),
    parserMode: parserMode || 'ai',
  };
}

function extractJsonFromContent(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function isOllamaReachable(baseUrl, timeoutMs = 5000) {
  try {
    const response = await fetchWithTimeout(
      `${baseUrl.replace(/\/$/, '')}/api/tags`,
      { method: 'GET' },
      timeoutMs
    );
    return response.ok;
  } catch {
    return false;
  }
}

async function parseWithOpenAI(cvText, { apiKey, model }) {
  const trimmed = cvText.trim().slice(0, 14000);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Texte du CV:\n\n${trimmed}` },
      ],
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    logger.warn('OpenAI CV parse failed', { status: response.status, errBody: errBody.slice(0, 300) });
    return null;
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = extractJsonFromContent(content);
  return normalizeAiPayload(parsed, 'ai-openai');
}

async function parseWithOllama(cvText, { baseUrl, model, timeoutMs }) {
  const trimmed = cvText.trim().slice(0, 8000);
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;
  const limit = timeoutMs || 90000;

  const reachable = await isOllamaReachable(baseUrl, 5000);
  if (!reachable) {
    logger.warn('Ollama unreachable — fallback analyse heuristique');
    return null;
  }

  let response;
  try {
    response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'llama3.2',
          stream: false,
          format: 'json',
          keep_alive: '10m',
          options: { temperature: 0.1, num_predict: 1800 },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Texte du CV:\n\n${trimmed}` },
          ],
        }),
      },
      limit
    );
  } catch (error) {
    const aborted = error?.name === 'AbortError';
    logger.warn(aborted ? 'Ollama CV parse timeout' : 'Ollama CV parse error', error?.message || error);
    return null;
  }

  if (!response.ok) {
    const errBody = await response.text();
    logger.warn('Ollama CV parse failed', { status: response.status, errBody: errBody.slice(0, 300) });
    return null;
  }

  const data = await response.json();
  const content = data.message?.content;
  if (!content) {
    return null;
  }

  const parsed = extractJsonFromContent(content);
  return normalizeAiPayload(parsed, 'ai-ollama');
}

async function parseResumeWithAi(cvText, env) {
  if (!cvText || cvText.trim().length < 40) {
    return null;
  }

  const provider = resolveCvLlmProvider(env);
  if (!provider) {
    return null;
  }

  try {
    if (provider === 'openai') {
      return await parseWithOpenAI(cvText, {
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
      });
    }

    if (provider === 'ollama') {
      return await parseWithOllama(cvText, {
        baseUrl: env.OLLAMA_BASE_URL,
        model: env.OLLAMA_MODEL,
        timeoutMs: env.OLLAMA_CV_TIMEOUT_MS,
      });
    }
  } catch (error) {
    logger.warn(`CV AI parse error (${provider})`, error);
    return null;
  }

  return null;
}

module.exports = {
  parseResumeWithAi,
  normalizeAiPayload,
};
