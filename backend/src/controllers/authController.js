'use strict';

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { query } = require('../db/pool');
const { jwt: jwtConfig } = require('../config/env');

const BCRYPT_ROUNDS = 12;

// ── helpers ──────────────────────────────────────────────────────────────────

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    jwtConfig.accessSecret,
    { expiresIn: jwtConfig.accessTtl }
  );
}

function signRefresh(user) {
  return jwt.sign(
    { sub: user.id },
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshTtl }
  );
}

async function saveRefreshToken(userId, token) {
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, hash, expires]
  );
}

// ── controllers ───────────────────────────────────────────────────────────────

async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const { rows: existing } = await query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role`,
      [email, password_hash]
    );

    const user = rows[0];
    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const { rows } = await query(
      'SELECT id, email, role, password_hash, totp_enabled FROM users WHERE email = $1',
      [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // if 2FA enabled, require totp_code
    if (user.totp_enabled) {
      const { totp_code } = req.body;
      if (!totp_code) {
        return res.status(200).json({ twoFactorRequired: true });
      }
      const { rows: secretRows } = await query(
        'SELECT totp_secret FROM users WHERE id = $1', [user.id]
      );
      const verified = speakeasy.totp.verify({
        secret: secretRows[0].totp_secret,
        encoding: 'base32',
        token: totp_code,
        window: 1,
      });
      if (!verified) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    await saveRefreshToken(user.id, refreshToken);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: { id: user.id, email: user.email, role: user.role }, accessToken });
  } catch (err) {
    next(err);
  }
}

async function refresh(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token' });
    }

    let payload;
    try {
      payload = jwt.verify(token, jwtConfig.refreshSecret);
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const { rows } = await query(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1 AND user_id = $2 AND expires_at > NOW()`,
      [hash, payload.sub]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token revoked or expired' });
    }

    const { rows: userRows } = await query(
      'SELECT id, email, role FROM users WHERE id = $1', [payload.sub]
    );
    if (userRows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const accessToken = signAccess(userRows[0]);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      const hash = crypto.createHash('sha256').update(token).digest('hex');
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [hash]);
    }
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
}

async function setup2FA(req, res, next) {
  try {
    const secret = speakeasy.generateSecret({ name: `CodeGuard:${req.user.email}` });
    await query('UPDATE users SET totp_secret = $1 WHERE id = $2', [secret.base32, req.user.id]);
    const qrUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCode: qrUrl, secret: secret.base32 });
  } catch (err) {
    next(err);
  }
}

async function verify2FA(req, res, next) {
  try {
    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token is required' });
    }

    const { rows } = await query(
      'SELECT totp_secret FROM users WHERE id = $1', [req.user.id]
    );
    const verified = speakeasy.totp.verify({
      secret: rows[0].totp_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    await query('UPDATE users SET totp_enabled = TRUE WHERE id = $1', [req.user.id]);
    res.json({ message: '2FA enabled successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, setup2FA, verify2FA };