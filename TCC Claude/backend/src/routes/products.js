const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const { createProduct, updateProduct, deleteProduct, withdrawProduct, listProducts } = require('../controllers/productController');
const { getBarcodeProduct } = require('../controllers/barcodeController');

router.use(authMiddleware);

router.get('/', exigePermissao('estoque:ver'), listProducts);
router.get('/barcode/:codigo', exigePermissao('produto:cadastrar'), getBarcodeProduct);
router.post('/', exigePermissao('produto:cadastrar'), createProduct);
router.put('/:id', exigePermissao('produto:editar'), updateProduct);
router.delete('/:id', exigePermissao('produto:excluir'), deleteProduct);
router.post('/:id/withdraw', exigePermissao('produto:retirar'), withdrawProduct);

module.exports = router;
