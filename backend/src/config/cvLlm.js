'use strict';

/**
 * CV parsing LLM configuration.
 * - off: free heuristic parser only
 * - ollama: free, local (https://ollama.com)
 * - openai: paid API (https://platform.openai.com)
 */
function resolveCvLlmProvider(env) {
  const mode = env.CV_LLM_PROVIDER || 'off';

  if (mode === 'off') {
    return null;
  }

  if (mode === 'ollama') {
    return 'ollama';
  }

  if (mode === 'openai' && env.OPENAI_API_KEY) {
    return 'openai';
  }

  return null;
}

function isCvAiEnabled(env) {
  return resolveCvLlmProvider(env) !== null;
}

module.exports = {
  resolveCvLlmProvider,
  isCvAiEnabled,
};
