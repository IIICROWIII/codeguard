'use strict';

require('dotenv').config();

const required = ['DATABASE_URL'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.warn(`[config] Missing env vars: ${missing.join(', ')} — falling back to defaults`);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/codeguard',
  pgSsl: process.env.PGSSL === 'true',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessTtl: process.env.JWT_ACCESS_TTL || '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL || '7d',
  },
};
