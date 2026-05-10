'use strict';

const { query } = require('../db/pool');
const { UUID_RE } = require('../middleware/requireAuth');

const VALID_DIFFICULTIES = new Set(['beginner', 'intermediate', 'security']);

async function list(req, res, next) {
  try {
    const { difficulty } = req.query;
    if (difficulty && !VALID_DIFFICULTIES.has(difficulty)) {
      return res.status(400).json({ error: 'Invalid difficulty filter' });
    }

    const sql = difficulty
      ? `SELECT id, title, description, difficulty, expected_issues
         FROM challenges WHERE difficulty = $1
         ORDER BY title`
      : `SELECT id, title, description, difficulty, expected_issues
         FROM challenges
         ORDER BY difficulty, title`;
    const params = difficulty ? [difficulty] : [];

    const { rows } = await query(sql, params);
    res.json({ challenges: rows });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(id)) {
      return res.status(400).json({ error: 'Invalid challenge id' });
    }
    const { rows } = await query(
      `SELECT id, title, description, difficulty, starter_code, expected_issues
       FROM challenges WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }
    res.json({ challenge: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
