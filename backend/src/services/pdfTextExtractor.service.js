'use strict';

const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

async function extractWithPdfParse(buffer) {
  const primary = await pdfParse(buffer);
  let text = (primary.text || '').trim();

  if (text.length >= 40) {
    return { text, method: 'pdf-parse' };
  }

  const verbose = await pdfParse(buffer, { max: 0 });
  text = (verbose.text || '').trim();
  if (text.length >= 40) {
    return { text, method: 'pdf-parse-verbose' };
  }

  return { text: text || primary.text || '', method: 'pdf-parse-empty' };
}

async function extractTextFromPdfFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    const result = await extractWithPdfParse(buffer);

    if (result.text.length < 40) {
      logger.warn('PDF text extraction yielded little text (scanned PDF?)', {
        filePath,
        length: result.text.length,
        method: result.method,
      });
    }

    return result.text;
  } catch (error) {
    logger.warn('PDF text extraction failed', { filePath, error: error.message });
    return '';
  }
}

function isPdfTextUsable(text) {
  return Boolean(text && text.trim().length >= 40);
}

module.exports = {
  extractTextFromPdfFile,
  isPdfTextUsable,
};
