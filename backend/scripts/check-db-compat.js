'use strict';

/**
 * Lightweight pre-production database checks.
 * It does not mutate data; it verifies connectivity, migration table status,
 * and MySQL/MariaDB support for functions used by recent migrations.
 */

const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const {
  DB_HOST = 'localhost',
  DB_PORT = '3306',
  DB_NAME = 'job_board',
  DB_USER = 'root',
  DB_PASSWORD = '',
} = process.env;

const MIGRATIONS_REQUIRING_REGEXP_SUBSTR = ['029_job_salary_structured.sql'];

async function hasMigrationTable(conn) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(1) AS count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'schema_migrations'
    `
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function appliedMigrations(conn) {
  if (!(await hasMigrationTable(conn))) return new Set();
  const [rows] = await conn.query('SELECT name FROM schema_migrations');
  return new Set(rows.map((row) => row.name));
}

async function supportsRegexpSubstr(conn) {
  try {
    const [rows] = await conn.query("SELECT REGEXP_SUBSTR('salary 1200', '[0-9]+') AS value");
    return rows[0]?.value === '1200';
  } catch {
    return false;
  }
}

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
  });

  try {
    const [[versionRow]] = await conn.query('SELECT VERSION() AS version, DATABASE() AS dbName');
    console.log(`DB: ${versionRow.dbName}`);
    console.log(`Version: ${versionRow.version}`);

    const applied = await appliedMigrations(conn);
    const regexOk = await supportsRegexpSubstr(conn);
    console.log(`REGEXP_SUBSTR support: ${regexOk ? 'ok' : 'missing'}`);

    const pendingRegexMigrations = MIGRATIONS_REQUIRING_REGEXP_SUBSTR.filter(
      (name) => !applied.has(name)
    );

    if (pendingRegexMigrations.length && !regexOk) {
      throw new Error(
        `Pending migration(s) require REGEXP_SUBSTR but the DB does not support it: ${pendingRegexMigrations.join(', ')}`
      );
    }

    console.log(`Applied migrations tracked: ${applied.size}`);
    console.log('DB compatibility check complete.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('DB compatibility check failed:', err.message);
  process.exit(1);
});
