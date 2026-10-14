const supabase = require('../supabase');

async function getProdutos() {
  const { data, error } = await supabase
    .from('products')
    .select('id, nome, quantidade, unidade, categoria')
    .gt('quantidade', 0)
    .order('nome');

  if (error) throw new Error(error.message);
  return data;
}

async function pagarPedido(pedidoId, userId) {
  const { data, error } = await supabase.rpc('pagar_pedido', {
    p_pedido_id: pedidoId,
    p_user_id: userId,
  });

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { getProdutos, pagarPedido };
