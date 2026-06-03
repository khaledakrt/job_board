'use strict';

require('./models');
const app = require('./app');
const { env } = require('./config');
const { connectDatabase, disconnectDatabase } = require('./database/connection');
const logger = require('./utils/logger');

let server;

async function startServer() {
  await connectDatabase();

  server = app.listen(env.PORT, () => {
    logger.info(`Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully...`);

  if (server) {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  }

  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

startServer().catch((error) => {
  logger.error('Failed to start server', error);
  process.exit(1);
});
