'use strict';

const express = require('express');
const { requireAuth } = require('../middleware/requireAuth');
const { create, listMine, getById } = require('../controllers/submissionsController');

const router = express.Router();

router.use(requireAuth);

router.post('/', create);
router.get('/me', listMine);
router.get('/:id', getById);

module.exports = router;
