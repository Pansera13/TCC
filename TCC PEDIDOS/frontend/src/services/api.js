const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.message || `Erro ${res.status}`);
    err.status = res.status;
    err.erros = json.erros || null;
    throw err;
  }
  return json;
}

export const api = {
  getProdutos: () => request('GET', '/estoque/produtos'),

  criarPedido: (mesa) => request('POST', '/pedidos', { mesa }),
  adicionarItem: (pedidoId, item) => request('POST', `/pedidos/${pedidoId}/itens`, item),
  atualizarItem: (pedidoId, itemId, quantidade) => request('PATCH', `/pedidos/${pedidoId}/itens/${itemId}`, { quantidade }),
  removerItem: (pedidoId, itemId) => request('DELETE', `/pedidos/${pedidoId}/itens/${itemId}`),
  confirmarPedido: (pedidoId) => request('PATCH', `/pedidos/${pedidoId}/confirmar`),
  reabrirPedido: (pedidoId) => request('PATCH', `/pedidos/${pedidoId}/reabrir`),
  pagarPedido: (pedidoId) => request('PATCH', `/pedidos/${pedidoId}/pagar`),
  listarPedidos: () => request('GET', '/pedidos'),
  buscarPedido: (pedidoId) => request('GET', `/pedidos/${pedidoId}`),
  getMesasOcupadas: () => request('GET', '/pedidos/mesas-ocupadas'),
};
