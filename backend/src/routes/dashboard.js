'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { authorize } = require('../middleware/authorize');
const { query } = require('../db/pool');

const router = express.Router();

// ── User dashboard ────────────────────────────────────────────────────────────
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         COUNT(*)::int                                        AS total_submissions,
         COUNT(DISTINCT challenge_id)::int                   AS challenges_attempted,
         ROUND(AVG(score))::int                              AS avg_score,
         COUNT(*) FILTER (WHERE score = 100)::int            AS perfect_scores
       FROM submissions
       WHERE user_id = $1`,
      [req.user.id]
    );
    res.json({ stats: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.get('/recent', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, c.title AS challenge_title, s.score, s.submitted_at
       FROM submissions s
       JOIN challenges c ON c.id = s.challenge_id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC
       LIMIT 5`,
      [req.user.id]
    );
    res.json({ recent: rows });
  } catch (err) {
    next(err);
  }
});

// ── Admin dashboard ───────────────────────────────────────────────────────────
router.get('/admin/users', requireAuth, authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, email, role, totp_enabled, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    res.json({ users: rows });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/users/:id/role', requireAuth, authorize('admin'), async (req, res, next) => {
  try {
    const { role } = req.body || {};
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'role must be user or admin' });
    }
    const { rows } = await query(
      `UPDATE users SET role = $1 WHERE id = $2
       RETURNING id, email, role`,
      [role, req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;