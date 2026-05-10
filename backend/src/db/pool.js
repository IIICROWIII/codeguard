'use strict';

const { Pool } = require('pg');
const { databaseUrl, pgSsl } = require('../config/env');

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: pgSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

const query = (text, params) => pool.query(text, params);

module.exports = { pool, query };
