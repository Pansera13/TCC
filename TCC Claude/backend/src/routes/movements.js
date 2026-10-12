const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { listMovements } = require('../controllers/movementController');

router.use(authMiddleware);
router.get('/', listMovements);

module.exports = router;
