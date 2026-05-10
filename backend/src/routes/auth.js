'use strict';

const express = require('express');
const passport = require('../config/passport');
const { requireAuth } = require('../middleware/requireAuth');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../db/pool');
const { jwt: jwtConfig } = require('../config/env');
const {
  register,
  login,
  refresh,
  logout,
  setup2FA,
  verify2FA,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login',    login);
router.post('/refresh',  refresh);
router.post('/logout',   logout);

router.post('/2fa/setup',  requireAuth, setup2FA);
router.post('/2fa/verify', requireAuth, verify2FA);
router.get('/me',          requireAuth, (req, res) => {
  res.json({ user: req.user });
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user;
      const accessToken = jwt.sign(
        { sub: user.id, email: user.email, role: user.role },
        jwtConfig.accessSecret,
        { expiresIn: jwtConfig.accessTtl }
      );
      const refreshToken = jwt.sign(
        { sub: user.id },
        jwtConfig.refreshSecret,
        { expiresIn: jwtConfig.refreshTtl }
      );
      const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [user.id, hash, expires]
      );
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
    } catch (err) {
      res.redirect('/login?error=oauth_failed');
    }
  }
);

module.exports = router;