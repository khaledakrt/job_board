'use strict';

const path = require('path');
const { env } = require('../config');
const { isCvAiEnabled, resolveCvLlmProvider } = require('../config/cvLlm');
const resumeParserService = require('../services/resumeParser.service');
const candidateProfileService = require('../services/candidateProfile.service');
const asyncHandler = require('../utils/asyncHandler');

const parseResume = asyncHandler(async (req, res) => {
  const filePath = path.resolve(req.file.path);
  const parsed = await resumeParserService.parseResumePdf(filePath);

  const response = {
    first_name: parsed.first_name,
    last_name: parsed.last_name,
    phone: parsed.phone,
    professional_title: parsed.professional_title,
    bio: parsed.bio || null,
    skills: parsed.skills || [],
    experiences: parsed.experiences || [],
    education: parsed.education || [],
    parserMode: parsed.parserMode,
    parseQuality: parsed.parseQuality || 'low',
    aiEnabled: isCvAiEnabled(env),
    cvLlmProvider: resolveCvLlmProvider(env),
  };

  if (req.candidate) {
    await candidateProfileService.saveResumeFileOnly({
      userId: req.user.id,
      file: req.file,
    });
    response.resumeSaved = true;
  } else {
    response.resumeSaved = false;
  }

  const modeLabel =
    parsed.parserMode === 'ai-openai'
      ? 'analyse IA (OpenAI)'
      : parsed.parserMode === 'ai-ollama'
        ? 'analyse IA (Ollama)'
        : parsed.parserMode?.startsWith('ai')
          ? 'analyse IA'
          : 'analyse automatique';

  let message = `CV analysé (${modeLabel}). Vérifiez les données avant de les appliquer.`;
  if (!isCvAiEnabled(env) && response.parseQuality === 'low') {
    message =
      'CV analysé (mode gratuit). Peu de texte lisible dans le PDF — complétez expériences/formations à la main, ou exportez le CV en PDF texte (pas scan).';
  } else if (resolveCvLlmProvider(env) === 'ollama' && response.parseQuality === 'low') {
    message =
      'CV analysé. Si expériences vides : lancez « ollama pull llama3.2 » puis ré-uploadez, ou complétez à la main.';
  }

  res.status(200).json({
    success: true,
    message,
    data: response,
  });
});

const generateResumePdf = asyncHandler(async (req, res) => {
  const profile = await candidateProfileService.generateResumePdfFromProfile(req.user.id);

  res.status(200).json({
    success: true,
    message: 'CV PDF généré. Les recruteurs pourront le consulter lors de vos candidatures.',
    data: {
      resumeUrl: profile.resumeUrl,
      profile,
    },
  });
});

module.exports = {
  parseResume,
  generateResumePdf,
};
