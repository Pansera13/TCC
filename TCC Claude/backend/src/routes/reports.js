const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getReport } = require('../controllers/reportController');

router.use(authMiddleware);
router.get('/', getReport);

module.exports = router;
