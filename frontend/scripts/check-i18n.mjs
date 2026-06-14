import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const translationsPath = join(root, 'src', 'app', 'core', 'i18n', 'translations.ts');
const appPath = join(root, 'src', 'app');

const source = readFileSync(translationsPath, 'utf8');

function extractLanguageBlock(language) {
  const marker = `  ${language}: {`;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`Missing ${language} block in translations.ts`);
  }

  const blockStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = blockStart; i < source.length; i += 1) {
    const char = source[i];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return source.slice(blockStart, i + 1);
    }
  }

  throw new Error(`Could not parse ${language} block in translations.ts`);
}

function extractKeys(block) {
  return new Set([...block.matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]));
}

function walkFiles(directory, extensions, files = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walkFiles(fullPath, extensions, files);
    } else if (extensions.some((extension) => fullPath.endsWith(extension))) {
      files.push(fullPath);
    }
  }
  return files;
}

const frKeys = extractKeys(extractLanguageBlock('fr'));
const enKeys = extractKeys(extractLanguageBlock('en'));
const missingInEn = [...frKeys].filter((key) => !enKeys.has(key)).sort();
const missingInFr = [...enKeys].filter((key) => !frKeys.has(key)).sort();

const usedKeys = new Map();
for (const file of walkFiles(appPath, ['.ts', '.html'])) {
  const content = readFileSync(file, 'utf8');
  const relativePath = relative(root, file).replaceAll('\\', '/');
  const matches = [
    ...content.matchAll(/['"]([a-z][a-z0-9]*(?:\.[a-zA-Z0-9]+)+)['"]\s*\|\s*t\b/g),
    ...content.matchAll(/i18n\.translate\(['"]([^'"]+)['"]\)/g),
  ];

  for (const match of matches) {
    const key = match[1];
    if (!usedKeys.has(key)) usedKeys.set(key, []);
    usedKeys.get(key).push(relativePath);
  }
}

const missingUsedKeys = [...usedKeys.keys()]
  .filter((key) => !frKeys.has(key) || !enKeys.has(key))
  .sort()
  .map((key) => ({ key, files: [...new Set(usedKeys.get(key))].slice(0, 5) }));

if (missingInEn.length || missingInFr.length || missingUsedKeys.length) {
  console.error('i18n check failed.');
  if (missingInEn.length) console.error(`Missing in en (${missingInEn.length}):\n${missingInEn.join('\n')}`);
  if (missingInFr.length) console.error(`Missing in fr (${missingInFr.length}):\n${missingInFr.join('\n')}`);
  if (missingUsedKeys.length) {
    console.error(
      `Used keys missing in translations (${missingUsedKeys.length}):\n` +
        missingUsedKeys.map((item) => `${item.key} -> ${item.files.join(', ')}`).join('\n')
    );
  }
  process.exit(1);
}

console.log(`i18n check passed: ${frKeys.size} FR keys, ${enKeys.size} EN keys, ${usedKeys.size} used keys.`);
