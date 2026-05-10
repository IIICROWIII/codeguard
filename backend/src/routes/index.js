'use strict';

const express = require('express');
const health = require('./health');
const challenges = require('./challenges');
const submissions = require('./submissions');
const auth = require('./auth');
const dashboard = require('./dashboard');

const router = express.Router();

router.use('/health',      health);
router.use('/auth',        auth);
router.use('/challenges',  challenges);
router.use('/submissions', submissions);
router.use('/dashboard',   dashboard);

module.exports = router;