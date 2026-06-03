'use strict';

const { Sequelize } = require('sequelize');
const { env, databaseConfig } = require('../config');

const nodeEnv = env.NODE_ENV;
const config = databaseConfig[nodeEnv] || databaseConfig.development;

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    pool: config.pool,
    define: config.define,
    dialectOptions: config.dialectOptions,
    timezone: config.timezone,
    logging: config.logging,
  }
);

module.exports = sequelize;
