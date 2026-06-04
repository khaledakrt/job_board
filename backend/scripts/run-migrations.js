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

const DUPLICATE_PATTERNS = [
  /duplicate column/i,
  /duplicate key name/i,
  /already exists/i,
  /duplicate entry/i,
];

function isBenignMigrationError(err) {
  const msg = err?.message || String(err);
  return DUPLICATE_PATTERNS.some((re) => re.test(msg));
}

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

  await ensureMigrationsTable(conn);

  for (const file of files) {
    if (await isMigrationApplied(conn, file)) {
      console.log(`Skip ${file} (already applied)`);
      continue;
    }

    console.log(`Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    try {
      await conn.query(sql);
      await markMigrationApplied(conn, file);
      console.log(`OK ${file}`);
    } catch (err) {
      if (isBenignMigrationError(err)) {
        console.warn(`WARN ${file}: ${err.message} (marked as applied)`);
        await markMigrationApplied(conn, file);
        continue;
      }
      console.error(`FAILED ${file}:`, err.message);
      process.exit(1);
    }
  }

  await conn.end();
  console.log('Migrations complete.');
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
