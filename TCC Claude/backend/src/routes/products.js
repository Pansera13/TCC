const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const { createProduct, updateProduct, deleteProduct, withdrawProduct, listProducts } = require('../controllers/productController');
const { getBarcodeProduct } = require('../controllers/barcodeController');

router.use(authMiddleware);

router.get('/', listProducts);
router.get('/barcode/:codigo', getBarcodeProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', adminMiddleware, deleteProduct);
router.post('/:id/withdraw', withdrawProduct);

module.exports = router;
