'use strict';

const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal server error';
  let errors = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    const field = err.errors?.[0]?.path;
    message =
      field === 'email' || field === 'uk_users_email'
        ? 'Cette adresse e-mail est déjà associée à un autre compte.'
        : 'Cette ressource existe déjà.';
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err.message && err.message.startsWith('CORS policy')) {
    statusCode = 403;
    message = err.message;
  } else if (err.name === 'MulterError') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large' : err.message;
  } else if (err.message && err.message.includes('Invalid file type')) {
    statusCode = 400;
    message = err.message;
  } else if (err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'JSON invalide.';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Payload too large';
  } else if (
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode < 500
  ) {
    statusCode = err.statusCode;
    message = err.message || message;
  } else if (Number.isInteger(err.status) && err.status >= 400 && err.status < 500) {
    statusCode = err.status;
    message = err.message || message;
  } else if (err.name === 'SequelizeDatabaseError' && [
    'WARN_DATA_TRUNCATED',
    'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
    'ER_DATA_TOO_LONG',
    'ER_WARN_DATA_OUT_OF_RANGE',
  ].includes(err.original?.code)) {
    statusCode = 400;
    message = 'Valeur invalide pour un champ du formulaire.';
    if (process.env.NODE_ENV === 'development' && err.original?.sqlMessage) {
      message = `${message} (${err.original.sqlMessage})`;
    }
  } else if (
    err.original?.code === 'ER_NO_SUCH_TABLE' ||
    err.original?.code === 'ER_BAD_FIELD_ERROR'
  ) {
    statusCode = 503;
    message =
      'Base de données non à jour. Exécutez les migrations : cd backend && npm run db:migrate';
    if (process.env.NODE_ENV === 'development' && err.original?.sqlMessage) {
      message = `${message} (${err.original.sqlMessage})`;
    }
  }

  if (statusCode >= 500) {
    logger.error(err.message, err);
  }

  const response = {
    success: false,
    message,
  };

  if (errors) {
    response.errors = errors;
  }

  if (process.env.NODE_ENV === 'development' && statusCode >= 500 && !(err instanceof ApiError)) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = errorHandler;
