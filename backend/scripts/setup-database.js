'use strict';

/**
 * Creates the MySQL database (if missing) and applies migrations/001_initial_schema.sql
 * Usage: node scripts/setup-database.js
 */

const fs = require('fs');
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

async function main() {
  console.log(`Connecting to MySQL at ${DB_HOST}:${DB_PORT} as ${DB_USER}...`);

  const admin = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  await admin.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  console.log(`Database "${DB_NAME}" is ready.`);

  await admin.query(`USE \`${DB_NAME}\``);

  const migrationPath = path.join(__dirname, '..', 'migrations', '001_initial_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('Applying migration 001_initial_schema.sql...');
  await admin.query(sql);

  await admin.end();
  console.log('Done. You can run: npm start');
}

main().catch((err) => {
  console.error('Database setup failed:', err.message);
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('Check DB_USER and DB_PASSWORD in backend/.env');
  }
  process.exit(1);
});
