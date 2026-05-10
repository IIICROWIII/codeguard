'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const { corsOrigin, nodeEnv } = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Body & Cookie parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));
app.use(cookieParser());

// ── Logging ───────────────────────────────────────────────────────────────────
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'production' ? 'combined' : 'dev'));
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter);
app.use('/api', routes);

// ── Error handling ────────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;