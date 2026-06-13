'use strict';

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

async function ensureMigrationsTable(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function isMigrationApplied(conn, name) {
  const [rows] = await conn.query(
    'SELECT 1 FROM schema_migrations WHERE name = ? LIMIT 1',
    [name]
  );
  return rows.length > 0;
}

async function markMigrationApplied(conn, name) {
  await conn.query('INSERT IGNORE INTO schema_migrations (name) VALUES (?)', [name]);
}

async function assertRegexpSubstrSupport(conn, file) {
  if (file !== '029_job_salary_structured.sql') return;

  try {
    await conn.query("SELECT REGEXP_SUBSTR('salary 1200', '[0-9]+') AS value");
  } catch (error) {
    throw new Error(
      `${file} requires MySQL 8+/REGEXP_SUBSTR support. DB check failed before applying migration: ${error.message}`
    );
  }
}

async function acquireMigrationLock(conn) {
  const [rows] = await conn.query('SELECT GET_LOCK(?, 30) AS acquired', [
    `${DB_NAME}:schema_migrations`,
  ]);
  if (rows[0]?.acquired !== 1) {
    throw new Error('Could not acquire migration lock');
  }
}

async function releaseMigrationLock(conn) {
  await conn.query('SELECT RELEASE_LOCK(?)', [`${DB_NAME}:schema_migrations`]);
}

async function main() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    multipleStatements: true,
  });

  try {
    await acquireMigrationLock(conn);
    await ensureMigrationsTable(conn);

    for (const file of files) {
      if (await isMigrationApplied(conn, file)) {
        console.log(`Skip ${file} (already applied)`);
        continue;
      }

      console.log(`Applying ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await assertRegexpSubstrSupport(conn, file);
      await conn.query(sql);
      await markMigrationApplied(conn, file);
      console.log(`OK ${file}`);
    }
  } finally {
    await releaseMigrationLock(conn).catch(() => undefined);
    await conn.end();
  }

  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
