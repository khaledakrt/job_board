'use strict';

/**
 * Best-effort client IP (trust proxy enabled on app).
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first.slice(0, 45);
  }
  const realIp = req.headers['x-real-ip'];
  if (realIp) return String(realIp).trim().slice(0, 45);
  return (req.ip || req.socket?.remoteAddress || 'unknown').slice(0, 45);
}

module.exports = getClientIp;
