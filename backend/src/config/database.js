'use strict';

/**
 * Sequelize configuration per NODE_ENV.
 * Used by database/sequelize.js and CLI tooling.
 */
function buildDatabaseConfig(env) {
  const base = {
    dialect: 'mysql',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    pool: {
      max: env.DB_POOL_MAX,
      min: env.DB_POOL_MIN,
      acquire: env.DB_POOL_ACQUIRE,
      idle: env.DB_POOL_IDLE,
    },
    define: {
      underscored: true,
      timestamps: false,
    },
    dialectOptions: {
      charset: 'utf8mb4',
      dateStrings: true,
      typeCast: true,
    },
    timezone: '+00:00',
  };

  return {
    development: {
      ...base,
      logging: (msg) => {
        if (process.env.DB_LOGGING === 'true') {
          // eslint-disable-next-line no-console
          console.debug(`[sequelize] ${msg}`);
        }
      },
    },
    test: {
      ...base,
      database: process.env.DB_NAME_TEST || `${env.DB_NAME}_test`,
      logging: false,
    },
    production: {
      ...base,
      logging: false,
      dialectOptions: {
        ...base.dialectOptions,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
      },
    },
  };
}

module.exports = { buildDatabaseConfig };
