'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { env, corsOptions, globalRateLimiter } = require('./config');
const { getUploadRoot } = require('./utils/fileStorage');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

const clientOrigin = env.CLIENT_URL.replace(/\/$/, '');

// Static uploads BEFORE helmet so PDFs/images can be embedded in the frontend iframe (localhost:4200)
app.use(
  '/uploads',
  express.static(path.join(getUploadRoot()), {
    maxAge: '7d',
    fallthrough: false,
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

app.use(env.API_PREFIX, routes);

app.use(notFound);

app.use(errorHandler);

module.exports = app;
