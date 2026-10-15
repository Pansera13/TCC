const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { listMovements, listMovementUsers } = require('../controllers/movementController');

router.use(authMiddleware);
router.get('/users', listMovementUsers);
router.get('/', listMovements);

module.exports = router;
