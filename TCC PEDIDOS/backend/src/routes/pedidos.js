const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const auth = require('../middleware/auth');
const { pagarPedido } = require('../services/estoqueService');

// POST /pedidos - cria pedido em rascunho
router.post('/', auth, async (req, res) => {
  const mesa = req.body.mesa ? parseInt(req.body.mesa) : null;

  const { data, error } = await supabase
    .from('pedidos')
    .insert({ user_id: req.userId, status: 'rascunho', mesa })
    .select('id, status, mesa, created_at')
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.status(201).json(data);
});

// POST /pedidos/:id/itens - adiciona item ao pedido
router.post('/:id/itens', auth, async (req, res) => {
  const pedidoId = req.params.id;
  const { product_id, product_nome, quantidade, unidade } = req.body;

  const qty = parseFloat(quantidade);
  if (!product_id || !product_nome) {
    return res.status(400).json({ message: 'product_id e product_nome são obrigatórios.' });
  }
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ message: 'Quantidade deve ser maior que zero.' });
  }

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('id, status, user_id')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível adicionar itens a pedidos em rascunho.' });
  }

  const { data: item, error: itemErr } = await supabase
    .from('itens_pedido')
    .insert({ pedido_id: pedidoId, product_id, product_nome, quantidade: qty, unidade: unidade || 'UN' })
    .select()
    .single();

  if (itemErr) return res.status(500).json({ message: itemErr.message });
  return res.status(201).json(item);
});

// PATCH /pedidos/:id/itens/:itemId - atualiza quantidade do item
router.patch('/:id/itens/:itemId', auth, async (req, res) => {
  const { id: pedidoId, itemId } = req.params;
  const qty = parseInt(req.body.quantidade);

  if (isNaN(qty) || qty < 1) {
    return res.status(400).json({ message: 'Quantidade deve ser um número inteiro maior que zero.' });
  }

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos').select('id, status, user_id').eq('id', pedidoId).single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível editar itens de pedidos em rascunho.' });
  }

  const { data: item, error } = await supabase
    .from('itens_pedido')
    .update({ quantidade: qty })
    .eq('id', itemId)
    .eq('pedido_id', pedidoId)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  return res.json(item);
});

// DELETE /pedidos/:id/itens/:itemId - remove item do pedido
router.delete('/:id/itens/:itemId', auth, async (req, res) => {
  const { id: pedidoId, itemId } = req.params;

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('id, status, user_id')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Só é possível remover itens de pedidos em rascunho.' });
  }

  const { error } = await supabase
    .from('itens_pedido')
    .delete()
    .eq('id', itemId)
    .eq('pedido_id', pedidoId);

  if (error) return res.status(500).json({ message: error.message });
  return res.json({ message: 'Item removido com sucesso.' });
});

// PATCH /pedidos/:id/confirmar - avança para confirmado
router.patch('/:id/confirmar', auth, async (req, res) => {
  const pedidoId = req.params.id;

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('id, status, user_id')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });
  if (pedido.status !== 'rascunho') {
    return res.status(400).json({ message: 'Apenas pedidos em rascunho podem ser confirmados.' });
  }

  const { data: itens } = await supabase
    .from('itens_pedido')
    .select('id')
    .eq('pedido_id', pedidoId);

  if (!itens || itens.length === 0) {
    return res.status(400).json({ message: 'Pedido vazio. Adicione ao menos um item antes de confirmar.' });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('pedidos')
    .update({ status: 'confirmado' })
    .eq('id', pedidoId)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ message: updateErr.message });
  return res.json(updated);
});

// PATCH /pedidos/:id/pagar - baixa estoque de forma atômica via RPC
router.patch('/:id/pagar', auth, async (req, res) => {
  const pedidoId = req.params.id;

  let resultado;
  try {
    resultado = await pagarPedido(pedidoId, req.userId);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }

  if (!resultado.ok) {
    const mapa = {
      nao_encontrado: 404,
      acesso_negado: 403,
      status_invalido: 400,
      estoque_insuficiente: 409,
    };
    const status = mapa[resultado.codigo] || 500;
    return res.status(status).json({
      message: resultado.mensagem,
      erros: resultado.erros || [],
    });
  }

  const { data: pedidoAtualizado, error: fetchErr } = await supabase
    .from('pedidos')
    .select('id, status, mesa, estoque_erros, created_at, updated_at')
    .eq('id', pedidoId)
    .single();

  if (fetchErr) return res.status(500).json({ message: fetchErr.message });
  return res.json(pedidoAtualizado);
});

// PATCH /pedidos/:id/reabrir - volta de confirmado para rascunho
router.patch('/:id/reabrir', auth, async (req, res) => {
  const pedidoId = req.params.id;

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('id, status, user_id')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });
  if (pedido.status !== 'confirmado') {
    return res.status(400).json({ message: 'Só é possível reabrir pedidos com status confirmado.' });
  }

  const { data: updated, error: updateErr } = await supabase
    .from('pedidos')
    .update({ status: 'rascunho' })
    .eq('id', pedidoId)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ message: updateErr.message });
  return res.json(updated);
});

// GET /pedidos/mesas-ocupadas - retorna {mesa, pedido_id, status} para cada mesa ativa
router.get('/mesas-ocupadas', auth, async (req, res) => {
  // !inner garante que só retorna pedidos que tenham ao menos 1 item
  const { data, error } = await supabase
    .from('pedidos')
    .select('mesa, id, status, itens_pedido!inner(id)')
    .in('status', ['rascunho', 'confirmado'])
    .not('mesa', 'is', null)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  // Uma entrada por mesa (pedido mais recente)
  const porMesa = {};
  for (const p of (data || [])) {
    if (!porMesa[p.mesa]) {
      porMesa[p.mesa] = { mesa: p.mesa, pedido_id: p.id, status: p.status };
    }
  }
  return res.json(Object.values(porMesa));
});

// GET /pedidos - lista todos os pedidos
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabase
    .from('pedidos')
    .select('id, status, mesa, estoque_erros, created_at, updated_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  return res.json(data || []);
});

// GET /pedidos/:id - detalhes do pedido com itens
router.get('/:id', auth, async (req, res) => {
  const pedidoId = req.params.id;

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .select('id, status, mesa, estoque_erros, created_at, updated_at, user_id')
    .eq('id', pedidoId)
    .single();

  if (pedidoErr || !pedido) return res.status(404).json({ message: 'Pedido não encontrado.' });
  if (pedido.user_id !== req.userId) return res.status(403).json({ message: 'Acesso negado.' });

  const { data: itens } = await supabase
    .from('itens_pedido')
    .select('id, product_id, product_nome, quantidade, unidade')
    .eq('pedido_id', pedidoId);

  const { user_id, ...pedidoSemUserId } = pedido;
  return res.json({ ...pedidoSemUserId, itens: itens || [] });
});

module.exports = router;
