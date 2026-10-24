const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const {
  createProduct, updateProduct, deleteProduct, withdrawProduct,
  entryProduct, archiveProduct, restoreProduct, listProducts,
} = require('../controllers/productController');
const { getBarcodeProduct } = require('../controllers/barcodeController');

router.use(authMiddleware);

router.get('/', exigePermissao('estoque:ver'), listProducts);
router.get('/barcode/:codigo', exigePermissao('produto:cadastrar'), getBarcodeProduct);
router.post('/', exigePermissao('produto:cadastrar'), createProduct);
router.put('/:id', exigePermissao('produto:editar'), updateProduct);
router.delete('/:id', exigePermissao('produto:excluir'), deleteProduct);
router.post('/:id/withdraw', exigePermissao('produto:retirar'), withdrawProduct);
router.post('/:id/entry', exigePermissao('produto:entrada'), entryProduct);
router.post('/:id/archive', exigePermissao('produto:arquivar'), archiveProduct);
router.post('/:id/restore', exigePermissao('produto:restaurar'), restoreProduct);

module.exports = router;
