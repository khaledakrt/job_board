'use strict';

/**
 * Normalize a raw IP string for storage/display.
 * - IPv4-mapped IPv6 (::ffff:192.168.0.1) → 192.168.0.1
 * - IPv6 loopback (::1) → 127.0.0.1
 */
function normalizeIpAddress(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let ip = raw.trim();
  if (!ip) return null;

  if (ip.startsWith('::ffff:')) {
    const v4 = ip.slice(7);
    if (isIPv4(v4)) return v4;
  }

  if (ip === '::1') return '127.0.0.1';

  if (ip.includes('%')) {
    ip = ip.split('%')[0];
  }

  return ip.slice(0, 45);
}

function isIPv4(ip) {
  if (!ip || !ip.includes('.')) return false;
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function isIPv6(ip) {
  if (!ip || !ip.includes(':')) return false;
  return /^[0-9a-f:]+$/i.test(ip);
}

/**
 * Collect candidate client IPs from the request (proxy headers + socket).
 */
function collectClientIpCandidates(req) {
  const seen = new Set();
  const out = [];

  const add = (value) => {
    const normalized = normalizeIpAddress(value);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    for (const part of String(forwarded).split(',')) {
      add(part);
    }
  }

  add(req.headers['x-real-ip']);
  add(req.ip);
  add(req.socket?.remoteAddress);

  return out;
}

/**
 * Prefer a public/private IPv4 when available; otherwise keep IPv6.
 */
function pickPreferredClientIp(candidates) {
  if (!candidates?.length) return null;
  const ipv4 = candidates.find(isIPv4);
  if (ipv4) return ipv4;
  return candidates[0];
}

function getClientIp(req) {
  const candidates = collectClientIpCandidates(req);
  return pickPreferredClientIp(candidates) || 'unknown';
}

/**
 * Format IP already stored in DB (older rows may still be IPv6-mapped).
 */
function formatStoredIpAddress(stored) {
  if (!stored || stored === 'unknown') return stored;
  return normalizeIpAddress(stored) || stored;
}

module.exports = {
  normalizeIpAddress,
  isIPv4,
  isIPv6,
  collectClientIpCandidates,
  pickPreferredClientIp,
  getClientIp,
  formatStoredIpAddress,
};
