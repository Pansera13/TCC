const pool = require('../db');
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

  const [result] = await pool.execute(
    `INSERT INTO products (nome, quantidade, unidade, peso_kg, categoria, fornecedor)
     VALUES (?, ?, ?, ?, ?, ?)`,
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
    product_id: result.insertId,
    product_nome: String(nome).trim(),
    tipo: 'entrada',
    quantidade: qty,
    user_id: req.user.id,
    user_nome: req.user.nome,
  });

  return res.status(201).json({ id: result.insertId, message: 'Produto criado com sucesso.' });
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

  const [result] = await pool.execute(
    'UPDATE products SET nome = ?, quantidade = ?, unidade = ?, categoria = ?, fornecedor = ? WHERE id = ?',
    [
      String(nome).trim(),
      qty,
      String(unidade).trim(),
      categoria ? String(categoria).trim() : null,
      fornecedor ? String(fornecedor).trim() : null,
      id,
    ]
  );

  if (result.affectedRows === 0) {
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

  // Decrement atomically, fails if stock would go negative
  const [result] = await pool.execute(
    'UPDATE products SET quantidade = quantidade - ? WHERE id = ? AND quantidade >= ?',
    [quantidade, id, quantidade]
  );

  if (result.affectedRows === 0) {
    // Check if product exists or if it's a stock issue
    const [rows] = await pool.execute('SELECT id, quantidade FROM products WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
    return res.status(400).json({ message: `Estoque insuficiente. Disponível: ${rows[0].quantidade}.` });
  }

  const [rows] = await pool.execute('SELECT nome FROM products WHERE id = ?', [id]);
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
  const [rows] = await pool.execute(
    'SELECT id, nome, quantidade, unidade, peso_kg, categoria, fornecedor, created_at FROM products ORDER BY created_at DESC'
  );
  return res.json(rows);
}

module.exports = { createProduct, updateProduct, withdrawProduct, listProducts };
