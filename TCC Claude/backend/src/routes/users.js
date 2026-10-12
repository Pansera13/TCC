const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { listUsers, createUser, updateUserRole, toggleUserStatus } = require('../controllers/userController');

router.use(authMiddleware, adminMiddleware);

router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id/status', toggleUserStatus);

module.exports = router;
