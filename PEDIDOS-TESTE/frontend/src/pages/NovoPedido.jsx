import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

function categoriaLabel(cat) {
  if (!cat) return 'Outros';
  if (cat.toLowerCase().startsWith('lanche')) return 'Lanches';
  if (cat.toLowerCase().startsWith('bebida')) return 'Bebidas';
  return cat;
}

export default function NovoPedido() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mesaParam = searchParams.get('mesa') ? parseInt(searchParams.get('mesa')) : null;

  const [step, setStep]                 = useState(1);
  const [produtos, setProdutos]         = useState([]);
  const [selecionados, setSelecionados] = useState({});
  const [mesa, setMesa]                 = useState(mesaParam);
  const [mesasOcupadas, setMesasOcupadas] = useState([]);
  const [carregando, setCarregando]     = useState(true);
  const [erro, setErro]                 = useState('');
  const [salvando, setSalvando]         = useState(false);

  useEffect(() => {
    api.getProdutos()
      .then(setProdutos)
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, []);

  function setQuantidade(productId, value, max) {
    const qty = parseInt(value);
    if (isNaN(qty) || qty <= 0) {
      const { [productId]: _, ...rest } = selecionados;
      setSelecionados(rest);
    } else {
      setSelecionados(prev => ({ ...prev, [productId]: Math.min(qty, Math.floor(max)) }));
    }
  }

  function handleQuantidade(productId, delta, max) {
    setQuantidade(productId, (selecionados[productId] || 0) + delta, max);
  }

  async function handleProximo() {
    if (Object.keys(selecionados).length === 0) {
      setErro('Selecione ao menos um item.');
      return;
    }
    setErro('');
    try {
      const lista = await api.getMesasOcupadas();
      setMesasOcupadas(lista.map(m => m.mesa).filter(m => m !== mesaParam));
    } catch {
      setMesasOcupadas([]);
    }
    setStep(2);
  }

  async function handleCriarPedido() {
    const mesaFinal = mesaParam || mesa;
    if (!mesaFinal) { setErro('Selecione uma mesa.'); return; }
    setSalvando(true); setErro('');
    try {
      const pedido = await api.criarPedido(mesaFinal);
      for (const [productId, quantidade] of Object.entries(selecionados)) {
        const produto = produtos.find(p => String(p.id) === productId);
        await api.adicionarItem(pedido.id, {
          product_id: parseInt(productId),
          product_nome: produto?.nome || `Produto ${productId}`,
          quantidade,
          unidade: produto?.unidade || 'UN',
        });
      }
      navigate(`/pedidos/${pedido.id}`);
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) return <p className="page">Carregando produtos...</p>;

  const porCategoria = {};
  for (const p of produtos) {
    const cat = categoriaLabel(p.categoria);
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(p);
  }
  const categoriasOrdenadas = [
    ...['Lanches', 'Bebidas', 'Outros'].filter(c => porCategoria[c]),
    ...Object.keys(porCategoria).filter(c => !['Lanches', 'Bebidas', 'Outros'].includes(c)),
  ];

  /* ── ETAPA 1 ─────────────────────────────────────────────── */
  if (step === 1) {
    const totalItens = Object.keys(selecionados).length;
    return (
      <div className="page">
        <button onClick={() => navigate('/pedidos')} style={{ marginBottom: 16, padding: '8px 14px', minHeight: 40 }}>
          ← Voltar
        </button>
        <h2>
          {mesaParam ? `Mesa ${mesaParam} — Adicionar itens` : 'Novo Pedido'}
        </h2>
        <p style={{ color: 'var(--c-text-muted)', marginBottom: 20, fontSize: 13 }}>
          {mesaParam ? 'Selecione os itens' : 'Etapa 1 de 2 — Escolha os itens'}
        </p>


        {erro && <p style={{ color: 'red' }}>{erro}</p>}

        {categoriasOrdenadas.length === 0 ? (
          <p>Nenhum produto disponível no estoque.</p>
        ) : (
          categoriasOrdenadas.map(cat => (
            <div key={cat} style={{ marginBottom: 24 }}>
              <h3 style={{
                margin: '0 0 8px', padding: '8px 12px', borderRadius: 6, fontSize: 15,
                background: cat === 'Lanches' ? 'var(--c-cat-lanche)' : cat === 'Bebidas' ? 'var(--c-cat-bebida)' : 'var(--c-cat-outro)',
              }}>
                {cat === 'Lanches' ? '🍔 Lanches' : cat === 'Bebidas' ? '🥤 Bebidas' : cat}
              </h3>
              <div className="table-wrap">
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 280 }}>
                  <thead>
                    <tr style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>
                      <th style={{ textAlign: 'left', padding: '4px 8px' }}>Item</th>
                      <th className="col-disp" style={{ textAlign: 'right', padding: '4px 8px' }}>Disponível</th>
                      <th style={{ textAlign: 'center', padding: '4px 8px', width: 120 }}>Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {porCategoria[cat].map(p => {
                      const qtd = selecionados[p.id] || 0;
                      const max = Math.floor(p.quantidade);
                      return (
                        <tr key={p.id} style={{
                          background: qtd > 0 ? 'var(--c-row-sel)' : 'transparent',
                          borderBottom: '1px solid #f3f4f6',
                        }}>
                          <td style={{ padding: '10px 8px', fontWeight: qtd > 0 ? 600 : 400 }}>{p.nome}</td>
                          <td className="col-disp" style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--c-text-muted)', fontSize: 13 }}>
                            {max} {p.unidade}
                          </td>
                          <td style={{ padding: '8px 6px' }}>
                            <div className="qtd-row">
                              <button className="btn-qtd" disabled={qtd === 0} onClick={() => handleQuantidade(String(p.id), -1, max)}>−</button>
                              <input
                                className="input-qtd"
                                type="number" min="0" max={max}
                                value={qtd || ''}
                                onChange={e => setQuantidade(String(p.id), e.target.value, max)}
                              />
                              <button className="btn-qtd" disabled={qtd >= max} onClick={() => handleQuantidade(String(p.id), +1, max)}>+</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {totalItens > 0 && (
          <p style={{ color: '#16a34a', fontWeight: 500, marginBottom: 10 }}>
            {totalItens} item(s) selecionado(s)
          </p>
        )}

        <button
          className="btn-acao"
          onClick={handleProximo}
          disabled={salvando}
          style={{ background: '#2563eb', color: '#fff', width: '100%' }}
        >
          {salvando ? 'Aguarde...' : 'Próximo — Confirmar Mesa →'}
        </button>
      </div>
    );
  }

  /* ── ETAPA 2 ─────────────────────────────────────────────── */
  const totalItens2 = Object.entries(selecionados).reduce((acc, [, q]) => acc + q, 0);

  return (
    <div className="page">
      <button onClick={() => { setStep(1); setErro(''); }} style={{ marginBottom: 16, padding: '8px 14px', minHeight: 40 }}>
        ← Voltar aos Itens
      </button>
      <h2>{mesaParam ? `Mesa ${mesaParam} — Confirmar pedido` : 'Novo Pedido'}</h2>
      <p style={{ color: '#9ca3af', marginBottom: 20, fontSize: 13 }}>Etapa 2 de 2 — Confirme a mesa</p>

      <div style={{ background: 'var(--c-summary-bg)', border: '1px solid var(--c-border)', borderRadius: 8, padding: 14, marginBottom: 20 }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14 }}>Resumo — {totalItens2} unidades</p>
        {Object.entries(selecionados).map(([pid, qty]) => {
          const p = produtos.find(x => String(x.id) === pid);
          return (
            <div key={pid} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
              <span>{p?.nome || pid}</span>
              <span style={{ fontWeight: 600 }}>{qty} {p?.unidade || ''}</span>
            </div>
          );
        })}
      </div>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      <div className="mesa-grid" style={{ marginBottom: 24 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
          const ocupada = mesasOcupadas.includes(num);
          const selecionada = mesa === num;
          const cor = ocupada ? '#b91c1c' : selecionada ? '#1d4ed8' : '#15803d';
          const bg  = ocupada ? 'var(--c-mesa-ocu)' : selecionada ? 'var(--c-mesa-sel)' : 'var(--c-mesa-livre)';
          return (
            <button
              key={num}
              onClick={() => !ocupada && setMesa(num)}
              disabled={ocupada}
              className="mesa-btn"
              style={{ border: selecionada ? `3px solid ${cor}` : `2px solid ${ocupada ? '#fca5a5' : '#bbf7d0'}`, background: bg, color: cor }}
            >
              {num}
              <div className="mesa-btn-sub" style={{ fontSize: 11, fontWeight: 'normal', marginTop: 4 }}>
                {ocupada ? '🔴 Ocupada' : selecionada ? '✓ Selecionada' : '🟢 Livre'}
              </div>
            </button>
          );
        })}
      </div>

      <button
        className="btn-acao"
        onClick={handleCriarPedido}
        disabled={!mesa || salvando}
        style={{ background: mesa ? '#22c55e' : '#d1d5db', color: '#fff', width: '100%' }}
      >
        {salvando ? 'Criando...' : mesa ? `Criar Pedido — Mesa ${mesa}` : 'Selecione uma mesa'}
      </button>
    </div>
  );
}
