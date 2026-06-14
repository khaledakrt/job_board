const assert = require('node:assert/strict');
const test = require('node:test');

const { plainTextLength, sanitizeRichText } = require('../src/utils/richText');

test('sanitizeRichText removes executable HTML while preserving safe formatting', () => {
  const html = [
    '<h2 onclick="alert(1)">Mission</h2>',
    '<p>Hello <strong>candidate</strong></p>',
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
  ].join('');

  const sanitized = sanitizeRichText(html);

  assert.match(sanitized, /<h2>Mission<\/h2>/);
  assert.match(sanitized, /<strong>candidate<\/strong>/);
  assert.doesNotMatch(sanitized, /script/i);
  assert.doesNotMatch(sanitized, /onerror|onclick/i);
  assert.doesNotMatch(sanitized, /<img/i);
});

test('sanitizeRichText drops dangerous links and normalizes safe links', () => {
  const sanitized = sanitizeRichText(
    '<a href="javascript:alert(1)">bad</a><a href="https://example.com/jobs">good</a>'
  );

  assert.doesNotMatch(sanitized, /javascript:/i);
  assert.match(sanitized, /<a target="_blank" rel="noopener noreferrer">bad<\/a>/);
  assert.match(
    sanitized,
    /<a href="https:\/\/example\.com\/jobs" target="_blank" rel="noopener noreferrer">good<\/a>/
  );
});

test('plainTextLength counts sanitized readable content', () => {
  const sanitized = sanitizeRichText('<p>Senior developer&nbsp;&amp; team lead</p>');

  assert.equal(plainTextLength(sanitized), 'Senior developer & team lead'.length);
});
