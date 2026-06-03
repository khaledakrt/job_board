'use strict';

const sequelize = require('./sequelize');
const { env } = require('../config');
const logger = require('../utils/logger');

async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info(`MySQL connected [${env.NODE_ENV}] → ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to MySQL database', error);
    throw error;
  }
}

async function disconnectDatabase() {
  await sequelize.close();
  logger.info('MySQL connection closed');
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  sequelize,
};
