'use strict';

const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const { jwt: jwtConfig } = require('../config/env');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireAuth(req, res, next) {
  // Dev shim for testing — only in test/development
  if (process.env.NODE_ENV !== 'production') {
    const devId = req.header('X-Dev-User-Id');
    if (devId && UUID_RE.test(devId)) {
      try {
        const { rows } = await query(
          'SELECT id, email, role FROM users WHERE id = $1',
          [devId]
        );
        if (rows.length > 0) {
          req.user = rows[0];
          return next();
        }
      } catch (err) {
        return next(err);
      }
    }
  }

  // JWT auth
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized — missing token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, jwtConfig.accessSecret);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
  }
}

module.exports = { requireAuth, UUID_RE };