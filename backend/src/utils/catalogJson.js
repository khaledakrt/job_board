'use strict';

function parseJsonArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function shortText(text, max = 200) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

module.exports = { parseJsonArray, shortText };
