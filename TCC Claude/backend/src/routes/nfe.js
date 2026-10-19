const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const exigePermissao = require('../middleware/exigePermissao');
const { parseNfeXml } = require('../services/nfeService');

router.use(authMiddleware);

// Upload em memória (o XML não é gravado em disco), máx. 2 MB, apenas .xml
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const isXml = path.extname(file.originalname).toLowerCase() === '.xml'
      && ['application/xml', 'text/xml'].includes(file.mimetype);
    if (!isXml) return cb(Object.assign(new Error('Envie um arquivo no formato .xml.'), { status: 400 }));
    cb(null, true);
  },
});

function uploadXml(req, res, next) {
  upload.single('arquivo')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ message: 'O arquivo excede o limite de 2 MB.' });
    if (err instanceof multer.MulterError) return res.status(400).json({ message: 'Não foi possível ler o arquivo enviado.' });
    return res.status(err.status ?? 400).json({ message: err.message });
  });
}

// Cadastro a partir do XML da NF-e enviado pelo usuário (não usa API externa)
router.post('/xml', exigePermissao('produto:importar-nfe'), uploadXml, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
    const produtos = await parseNfeXml(req.file.buffer.toString('utf8'));
    if (!produtos.length) return res.status(422).json({ message: 'Nenhum produto encontrado na NF-e.' });
    return res.json({ produtos });
  } catch (err) {
    const status = err.status ?? 500;
    return res.status(status).json({ message: status === 500 ? 'Erro ao processar o XML da NF-e.' : err.message });
  }
});

module.exports = router;
