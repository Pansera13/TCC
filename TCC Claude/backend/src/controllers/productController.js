const db = require('../db');
const { logMovement } = require('../services/movementService');

async function createProduct(req, res) {
  const { nome, quantidade, unidade, peso_kg, categoria, fornecedor } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }
  const qty = parseFloat(quantidade);
  if (quantidade === undefined || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Quantidade deve ser um número maior que zero.' });
  }
  if (!unidade || !String(unidade).trim()) {
    return res.status(400).json({ message: 'Unidade é obrigatória.' });
  }

  const { rows } = await db.query(
    `INSERT INTO products (nome, quantidade, unidade, peso_kg, categoria, fornecedor)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [
      String(nome).trim(),
      qty,
      String(unidade).trim(),
      (peso_kg != null && peso_kg !== '' && !isNaN(parseFloat(peso_kg))) ? parseFloat(peso_kg) : null,
      categoria ? String(categoria).trim() : null,
      fornecedor ? String(fornecedor).trim() : null,
    ]
  );

  await logMovement({
    product_id: rows[0].id,
    product_nome: String(nome).trim(),
    tipo: 'entrada',
    quantidade: qty,
    user_id: req.user.id,
    user_nome: req.user.nome,
  });

  return res.status(201).json({ id: rows[0].id, message: 'Produto criado com sucesso.' });
}

async function updateProduct(req, res) {
  const id = parseInt(req.params.id);
  const { nome, quantidade, unidade, categoria, fornecedor } = req.body;

  if (!nome || !String(nome).trim()) {
    return res.status(400).json({ message: 'Nome é obrigatório.' });
  }
  const qty = parseFloat(quantidade);
  if (quantidade === undefined || isNaN(qty) || qty < 0) {
    return res.status(400).json({ message: 'Quantidade deve ser um número maior ou igual a zero.' });
  }
  if (!unidade || !String(unidade).trim()) {
    return res.status(400).json({ message: 'Unidade é obrigatória.' });
  }

  const { rowCount } = await db.query(
    `UPDATE products SET nome = $1, quantidade = $2, unidade = $3, categoria = $4, fornecedor = $5 WHERE id = $6`,
    [
      String(nome).trim(),
      qty,
      String(unidade).trim(),
      categoria ? String(categoria).trim() : null,
      fornecedor ? String(fornecedor).trim() : null,
      id,
    ]
  );

  if (rowCount === 0) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  return res.json({ message: 'Produto atualizado com sucesso.' });
}

async function withdrawProduct(req, res) {
  const id = parseInt(req.params.id);
  const quantidade = parseFloat(req.body.quantidade);

  if (isNaN(quantidade) || quantidade <= 0) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }

  const { rows, rowCount } = await db.query(
    `UPDATE products SET quantidade = quantidade - $1 WHERE id = $2 AND quantidade >= $1 RETURNING nome`,
    [quantidade, id]
  );

  if (rowCount === 0) {
    const { rows: check } = await db.query('SELECT id, quantidade FROM products WHERE id = $1', [id]);
    if (check.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
    return res.status(400).json({ message: `Estoque insuficiente. Disponível: ${check[0].quantidade}.` });
  }

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'saida',
    quantidade,
    user_id: req.user.id,
    user_nome: req.user.nome,
  });

  return res.json({ message: 'Retirada registrada com sucesso.' });
}

async function listProducts(req, res) {
  const { rows } = await db.query(
    `SELECT id, nome, quantidade, unidade, peso_kg, categoria, fornecedor, created_at FROM products ORDER BY created_at DESC`
  );
  return res.json(rows);
}

module.exports = { createProduct, updateProduct, withdrawProduct, listProducts };
