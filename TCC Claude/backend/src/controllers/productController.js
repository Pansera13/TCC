const db = require('../db');
const { logMovement } = require('../services/movementService');
const { can } = require('../utils/permissoes');

async function createProduct(req, res) {
  const { nome, quantidade, unidade, peso_kg, categoria, fornecedor, codigo_barras } = req.body;

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
    `INSERT INTO products (nome, quantidade, unidade, peso_kg, categoria, fornecedor, codigo_barras, tenant_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      String(nome).trim(),
      qty,
      String(unidade).trim(),
      (peso_kg != null && peso_kg !== '' && !isNaN(parseFloat(peso_kg))) ? parseFloat(peso_kg) : null,
      categoria ? String(categoria).trim() : null,
      fornecedor ? String(fornecedor).trim() : null,
      codigo_barras ? String(codigo_barras).trim() : null,
      req.user.tenant_id,
    ]
  );

  await logMovement({
    product_id: rows[0].id,
    product_nome: String(nome).trim(),
    tipo: 'entrada',
    quantidade: qty,
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
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

  const { rows: atuais } = await db.query(
    'SELECT nome, quantidade, unidade, categoria, fornecedor, arquivado FROM products WHERE id = $1 AND tenant_id = $2',
    [id, req.user.tenant_id]
  );
  if (atuais.length === 0) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }
  if (atuais[0].arquivado) {
    return res.status(409).json({ message: 'Produto arquivado.' });
  }
  const antigo = atuais[0];

  const novo = {
    nome: String(nome).trim(),
    quantidade: qty,
    unidade: String(unidade).trim(),
    categoria: categoria ? String(categoria).trim() : null,
    fornecedor: fornecedor ? String(fornecedor).trim() : null,
  };

  await db.query(
    `UPDATE products SET nome = $1, quantidade = $2, unidade = $3, categoria = $4, fornecedor = $5
     WHERE id = $6 AND tenant_id = $7 AND arquivado = false`,
    [novo.nome, novo.quantidade, novo.unidade, novo.categoria, novo.fornecedor, id, req.user.tenant_id]
  );

  const antes = {};
  const depois = {};
  for (const campo of Object.keys(novo)) {
    const a = campo === 'quantidade' ? parseFloat(antigo[campo]) : (antigo[campo] ?? null);
    if (a !== novo[campo]) {
      antes[campo] = a;
      depois[campo] = novo[campo];
    }
  }
  if (Object.keys(depois).length > 0) {
    await logMovement({
      product_id: id,
      product_nome: novo.nome,
      tipo: 'edicao',
      quantidade: 'quantidade' in depois ? Math.abs(depois.quantidade - antes.quantidade) : 0,
      user_id: req.user.id,
      user_nome: req.user.nome,
      tenant_id: req.user.tenant_id,
      detalhes: { antes, depois },
    });
  }

  return res.json({ message: 'Produto atualizado com sucesso.' });
}

async function deleteProduct(req, res) {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).json({ message: 'Produto inválido.' });
  }

  const { rows } = await db.query('SELECT nome, quantidade FROM products WHERE id = $1 AND tenant_id = $2', [id, req.user.tenant_id]);
  if (rows.length === 0) {
    return res.status(404).json({ message: 'Produto não encontrado.' });
  }

  try {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Produto vinculado a pedidos e não pode ser removido.' });
    }
    throw err;
  }

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'remocao',
    quantidade: parseFloat(rows[0].quantidade),
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
  });

  return res.json({ message: 'Produto removido com sucesso.' });
}

async function withdrawProduct(req, res) {
  const id = parseInt(req.params.id);
  const quantidade = parseFloat(req.body.quantidade);

  if (isNaN(quantidade) || quantidade <= 0) {
    return res.status(400).json({ message: 'Quantidade inválida.' });
  }

  const { rows: check } = await db.query(
    'SELECT id, quantidade, arquivado FROM products WHERE id = $1 AND tenant_id = $2',
    [id, req.user.tenant_id]
  );
  if (check.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
  if (check[0].arquivado) return res.status(409).json({ message: 'Produto arquivado.' });

  const { rows, rowCount } = await db.query(
    `UPDATE products SET quantidade = quantidade - $1
     WHERE id = $2 AND tenant_id = $3 AND quantidade >= $1 AND arquivado = false RETURNING nome`,
    [quantidade, id, req.user.tenant_id]
  );

  if (rowCount === 0) {
    return res.status(400).json({ message: `Estoque insuficiente. Disponível: ${check[0].quantidade}.` });
  }

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'saida',
    quantidade,
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
  });

  return res.json({ message: 'Retirada registrada com sucesso.' });
}

async function entryProduct(req, res) {
  const id = parseInt(req.params.id);
  const quantidade = parseFloat(req.body.quantidade);

  if (isNaN(quantidade) || quantidade <= 0) {
    return res.status(400).json({ message: 'Quantidade deve ser um número maior que zero.' });
  }

  const { rows, rowCount } = await db.query(
    `UPDATE products SET quantidade = quantidade + $1
     WHERE id = $2 AND tenant_id = $3 AND arquivado = false RETURNING nome`,
    [quantidade, id, req.user.tenant_id]
  );

  if (rowCount === 0) {
    const { rows: check } = await db.query(
      'SELECT arquivado FROM products WHERE id = $1 AND tenant_id = $2',
      [id, req.user.tenant_id]
    );
    if (check.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
    return res.status(409).json({ message: 'Produto arquivado.' });
  }

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'entrada',
    quantidade,
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
    origem: 'estoque',
  });

  return res.json({ message: 'Entrada registrada com sucesso.' });
}

async function archiveProduct(req, res) {
  const id = parseInt(req.params.id);

  const { rows } = await db.query(
    'SELECT nome, arquivado FROM products WHERE id = $1 AND tenant_id = $2',
    [id, req.user.tenant_id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
  if (rows[0].arquivado) return res.status(409).json({ message: 'Produto já está arquivado.' });

  await db.query(
    `UPDATE products SET arquivado = true, arquivado_em = now() WHERE id = $1`,
    [id]
  );

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'edicao',
    quantidade: 0,
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
    detalhes: { antes: { arquivado: false }, depois: { arquivado: true } },
  });

  return res.json({ message: 'Produto arquivado.' });
}

async function restoreProduct(req, res) {
  const id = parseInt(req.params.id);

  const { rows } = await db.query(
    'SELECT nome, arquivado FROM products WHERE id = $1 AND tenant_id = $2',
    [id, req.user.tenant_id]
  );
  if (rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });
  if (!rows[0].arquivado) return res.status(409).json({ message: 'Produto não está arquivado.' });

  await db.query(
    `UPDATE products SET arquivado = false, arquivado_em = null WHERE id = $1`,
    [id]
  );

  await logMovement({
    product_id: id,
    product_nome: rows[0].nome,
    tipo: 'edicao',
    quantidade: 0,
    user_id: req.user.id,
    user_nome: req.user.nome,
    tenant_id: req.user.tenant_id,
    detalhes: { antes: { arquivado: true }, depois: { arquivado: false } },
  });

  return res.json({ message: 'Produto restaurado.' });
}

async function listProducts(req, res) {
  const verArquivados = req.query.arquivados === '1';

  if (verArquivados && !can(req.user.role, 'produto:ver-arquivados')) {
    return res.status(403).json({ message: 'Você não tem permissão para esta ação.' });
  }

  if (verArquivados) {
    const { rows } = await db.query(
      `SELECT id, nome, quantidade, unidade, peso_kg, categoria, fornecedor, arquivado, arquivado_em, created_at
       FROM products WHERE tenant_id = $1 AND arquivado = true ORDER BY arquivado_em DESC`,
      [req.user.tenant_id]
    );
    return res.json(rows);
  }

  const { rows } = await db.query(
    `SELECT id, nome, quantidade, unidade, peso_kg, categoria, fornecedor, created_at
     FROM products WHERE tenant_id = $1 AND arquivado = false ORDER BY created_at DESC`,
    [req.user.tenant_id]
  );
  return res.json(rows);
}

module.exports = {
  createProduct, updateProduct, deleteProduct, withdrawProduct,
  entryProduct, archiveProduct, restoreProduct, listProducts,
};
