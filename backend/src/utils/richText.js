'use strict';

/** Plain-text length for validation (strips HTML tags and entities). */
function plainTextLength(value) {
  if (!value || typeof value !== 'string') return 0;
  const text = value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
  return text.length;
}

module.exports = { plainTextLength };
