'use strict';

const express = require('express');
const { query } = require('../db/pool');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'codeguard-backend' });
});

router.get('/db', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT 1 AS ok');
    res.json({ db: rows[0].ok === 1 ? 'ok' : 'unknown' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
