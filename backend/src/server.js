'use strict';

const app = require('./app');
const { port, nodeEnv } = require('./config/env');
const { pool } = require('./db/pool');

const server = app.listen(port, () => {
  console.log(`[server] codeguard-backend listening on :${port} (${nodeEnv})`);
});

function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down`);
  server.close(async (err) => {
    if (err) {
      console.error('[server] close error:', err);
      process.exit(1);
    }
    try {
      await pool.end();
    } catch (e) {
      console.error('[server] pool drain error:', e);
    }
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
