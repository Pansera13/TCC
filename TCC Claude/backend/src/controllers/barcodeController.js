'use strict';

const db = require('../db');
const { lookupBarcode } = require('../services/barcodeService');

const VALID_LENGTHS = new Set([8, 12, 13, 14]);

async function getBarcodeProduct(req, res) {
  const { codigo } = req.params;

  if (!/^\d+$/.test(codigo) || !VALID_LENGTHS.has(codigo.length)) {
    return res.status(400).json({
      message: 'Código inválido. Informe um EAN com 8, 12, 13 ou 14 dígitos numéricos.',
    });
  }

  // Verifica se o produto já está no estoque do tenant
  let jaCadastrado = false;
  let produtoExistente = null;
  try {
    const { rows } = await db.query(
      'SELECT id, nome FROM products WHERE codigo_barras = $1 AND tenant_id = $2 LIMIT 1',
      [codigo, req.user.tenant_id]
    );
    if (rows.length > 0) {
      jaCadastrado = true;
      produtoExistente = rows[0];
    }
  } catch (err) {
    // Coluna ainda não existe (antes da migration) — ignorar silenciosamente
    if (!/column .* does not exist/i.test(err.message)) throw err;
  }

  let produto;
  try {
    produto = await lookupBarcode(codigo);
  } catch (err) {
    const status = err.status || 502;
    return res.status(status).json({ message: err.message || 'Erro ao consultar a base de produtos.' });
  }

  if (!produto) {
    return res.status(404).json({
      message: 'Produto não encontrado nas bases de dados. Preencha os dados manualmente.',
      jaCadastrado,
      produtoExistente,
    });
  }

  return res.json({ ...produto, jaCadastrado, produtoExistente });
}

module.exports = { getBarcodeProduct };
