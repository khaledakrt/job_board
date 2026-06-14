'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { env, corsOptions, globalRateLimiter } = require('./config');
const {
  getLogoDirectory,
  getAvatarDirectory,
  getBrochureDirectory,
  getCatalogImageDirectory,
} = require('./utils/fileStorage');
const routes = require('./routes');
const seoRoutes = require('./routes/seo.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

function parseTrustProxy(value) {
  if (value === 'false') return false;
  if (value === 'true') return true;
  if (/^\d+$/.test(String(value))) return Number(value);
  return value;
}

app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY));

const clientOrigin = env.CLIENT_URL.replace(/\/$/, '');

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        'frame-ancestors': ["'self'", clientOrigin],
      },
    },
  })
);

function staticUploadOptions({ sensitive = false } = {}) {
  return {
    maxAge: sensitive ? 0 : '7d',
    fallthrough: false,
    setHeaders(res, filePath) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', clientOrigin);
      if (sensitive) {
        res.setHeader('Cache-Control', 'private, no-store');
      }
      if (filePath && String(filePath).toLowerCase().endsWith('.pdf')) {
        res.setHeader(
          'Content-Security-Policy',
          `frame-ancestors 'self' ${clientOrigin}`
        );
      }
    },
  };
}

// Public uploads only. CVs and application snapshots are protected below.
app.use('/uploads/logos', express.static(getLogoDirectory(), staticUploadOptions()));
app.use('/uploads/avatars', express.static(getAvatarDirectory(), staticUploadOptions()));
app.use('/uploads/brochures', express.static(getBrochureDirectory(), staticUploadOptions()));
app.use('/uploads/catalog-images', express.static(getCatalogImageDirectory(), staticUploadOptions()));
app.use(['/uploads/resumes', '/uploads/snapshots'], (_req, res) => {
  res.status(404).json({ success: false, message: 'Protected upload route moved to API' });
});

app.use(cors(corsOptions));

app.use(globalRateLimiter);

app.use(hpp());

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

app.use(seoRoutes);

app.use(env.API_PREFIX, routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
