'use strict';

const fs = require('fs/promises');

async function readPrefix(filePath, length = 16) {
  const handle = await fs.open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function isPdf(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isJpeg(buffer) {
  return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function isPng(buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isWebp(buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

async function matchesFileSignature(filePath, mimetype) {
  const prefix = await readPrefix(filePath);

  if (mimetype === 'application/pdf') return isPdf(prefix);
  if (mimetype === 'image/jpeg') return isJpeg(prefix);
  if (mimetype === 'image/png') return isPng(prefix);
  if (mimetype === 'image/webp') return isWebp(prefix);

  return false;
}

module.exports = {
  matchesFileSignature,
};
