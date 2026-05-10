'use strict';

const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function appliedSet(client) {
  const { rows } = await client.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map((r) => r.filename));
}

async function run() {
  const dir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await appliedSet(client);

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`[migrate] skip   ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      console.log(`[migrate] apply  ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('[migrate] done');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
