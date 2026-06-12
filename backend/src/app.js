'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { env, corsOptions, globalRateLimiter } = require('./config');
const {
  getUploadRoot,
  getLogoDirectory,
  getAvatarDirectory,
  getBrochureDirectory,
  getCatalogImageDirectory,
  getResumeDirectory,
  getSnapshotDirectory,
} = require('./utils/fileStorage');
const { User } = require('./models');
const tokenService = require('./services/token.service');
const { USER_ROLES } = require('./config/constants');
const routes = require('./routes');
const seoRoutes = require('./routes/seo.routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

const clientOrigin = env.CLIENT_URL.replace(/\/$/, '');

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

function extractUploadAccessToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return typeof req.query.access_token === 'string' ? req.query.access_token : null;
}

async function authenticateSensitiveUpload(req, res, next) {
  try {
    const token = extractUploadAccessToken(req);
    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findByPk(decoded.sub, {
      attributes: ['id', 'role', 'is_verified', 'is_banned', 'ban_reason'],
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'User no longer exists' });
    }

    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: user.ban_reason || 'Votre compte a été suspendu. Contactez le support.',
      });
    }

    if (!user.is_verified && user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: 'Adresse e-mail non confirmée.',
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
      isVerified: user.is_verified,
      isBanned: user.is_banned,
    };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

// Public uploads only. CVs and application snapshots are protected below.
app.use('/uploads/logos', express.static(getLogoDirectory(), staticUploadOptions()));
app.use('/uploads/avatars', express.static(getAvatarDirectory(), staticUploadOptions()));
app.use('/uploads/brochures', express.static(getBrochureDirectory(), staticUploadOptions()));
app.use('/uploads/catalog-images', express.static(getCatalogImageDirectory(), staticUploadOptions()));
app.use(
  '/uploads/resumes',
  authenticateSensitiveUpload,
  express.static(getResumeDirectory(), staticUploadOptions({ sensitive: true }))
);
app.use(
  '/uploads/snapshots',
  authenticateSensitiveUpload,
  express.static(getSnapshotDirectory(), staticUploadOptions({ sensitive: true }))
);

app.use(
  '/uploads',
  express.static(path.join(getUploadRoot()), {
    maxAge: '7d',
    fallthrough: true,
    setHeaders(res, filePath) {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', clientOrigin);
      if (filePath && String(filePath).toLowerCase().endsWith('.pdf')) {
        res.setHeader(
          'Content-Security-Policy',
          `frame-ancestors 'self' ${clientOrigin}`
        );
      }
    },
  })
);

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
