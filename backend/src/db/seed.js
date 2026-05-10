'use strict';

const { pool } = require('./pool');
const challenges = require('./seeds/challenges');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM challenges');
    if (rows[0].count > 0) {
      console.log(`[seed] ${rows[0].count} challenges already present — skipping`);
      await client.query('COMMIT');
      return;
    }

    for (const c of challenges) {
      await client.query(
        `INSERT INTO challenges (title, description, difficulty, starter_code, expected_issues)
         VALUES ($1, $2, $3, $4, $5)`,
        [c.title, c.description, c.difficulty, c.starter_code, JSON.stringify(c.expected_issues)]
      );
    }

    await client.query('COMMIT');
    console.log(`[seed] inserted ${challenges.length} challenges`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
