'use strict';

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
}

const logger = {
  info(message) {
    // eslint-disable-next-line no-console
    console.log(formatMessage('info', message));
  },
  warn(message) {
    // eslint-disable-next-line no-console
    console.warn(formatMessage('warn', message));
  },
  error(message, error) {
    // eslint-disable-next-line no-console
    console.error(formatMessage('error', message));
    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  },
  debug(message) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.debug(formatMessage('debug', message));
    }
  },
};

module.exports = logger;
