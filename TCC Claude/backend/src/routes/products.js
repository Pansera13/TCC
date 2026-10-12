const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { createProduct, updateProduct, withdrawProduct, listProducts } = require('../controllers/productController');

router.use(authMiddleware);

router.get('/', listProducts);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.post('/:id/withdraw', withdrawProduct);

module.exports = router;
