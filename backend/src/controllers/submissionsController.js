'use strict';

const { query } = require('../db/pool');
const { UUID_RE } = require('../middleware/requireAuth');
const { analyze } = require('../services/aiAnalyzer');

const MAX_CODE_BYTES = 50 * 1024; // spec: 50KB cap on submitted code

async function create(req, res, next) {
  try {
    const { challenge_id, code } = req.body || {};

    if (!challenge_id || !UUID_RE.test(challenge_id)) {
      return res.status(400).json({ error: 'challenge_id (uuid) is required' });
    }
    if (typeof code !== 'string' || code.length === 0) {
      return res.status(400).json({ error: 'code must be a non-empty string' });
    }
    if (Buffer.byteLength(code, 'utf8') > MAX_CODE_BYTES) {
      return res.status(413).json({ error: 'code exceeds 50KB limit' });
    }

    const { rows: chRows } = await query(
      'SELECT id, expected_issues FROM challenges WHERE id = $1',
      [challenge_id]
    );
    if (chRows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const feedback = analyze({ code, expectedIssues: chRows[0].expected_issues });

    const { rows } = await query(
      `INSERT INTO submissions (user_id, challenge_id, code, feedback, score)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, challenge_id, score, feedback, submitted_at`,
      [req.user.id, challenge_id, code, JSON.stringify(feedback), feedback.score]
    );

    res.status(201).json({ submission: rows[0] });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT s.id, s.challenge_id, c.title AS challenge_title,
              s.score, s.submitted_at
       FROM submissions s
       JOIN challenges c ON c.id = s.challenge_id
       WHERE s.user_id = $1
       ORDER BY s.submitted_at DESC`,
      [req.user.id]
    );
    res.json({ submissions: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: 'Invalid submission id' });
    }
    const { rows } = await query(
      `SELECT id, user_id, challenge_id, code, feedback, score, submitted_at
       FROM submissions WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    if (rows[0].user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden — not your submission' });
    }
    res.json({ submission: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, listMine, getById };
