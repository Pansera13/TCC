import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const STATUS_LABEL = {
  rascunho: 'Rascunho',
  confirmado: 'Confirmado',
  pago: 'Pago',
};

const STATUS_COR = {
  rascunho: '#f59e0b',
  confirmado: '#3b82f6',
  pago: '#22c55e',
};

export default function DetalhesPedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [acao, setAcao] = useState(false);
  const [estoqueErros, setEstoqueErros] = useState(null);
  const [qtdLocais, setQtdLocais] = useState({}); // edição local antes de salvar

  async function carregar() {
    try {
      const data = await api.buscarPedido(id);
      setPedido(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { carregar(); }, [id]);

  async function handleConfirmar() {
    setAcao(true);
    try {
      await api.confirmarPedido(id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAcao(false);
    }
  }

  async function handlePagar() {
    if (!window.confirm('Confirmar pagamento? O estoque será baixado automaticamente.')) return;
    setAcao(true);
    setErro('');
    setEstoqueErros(null);
    try {
      await api.pagarPedido(id);
      await carregar();
    } catch (err) {
      if (err.status === 409 && err.erros) {
        setEstoqueErros(err.erros);
        await carregar();
      } else {
        setErro(err.message);
      }
    } finally {
      setAcao(false);
    }
  }

  async function handleReabrir() {
    if (!window.confirm('Reabrir o pedido? Ele voltará para rascunho e poderá ser editado.')) return;
    setAcao(true);
    setErro('');
    try {
      await api.reabrirPedido(id);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAcao(false);
    }
  }

  async function handleAjustarItem(itemId, novaQtd) {
    const qty = parseInt(novaQtd);
    if (isNaN(qty) || qty < 1) return;
    setAcao(true);
    setErro('');
    try {
      await api.atualizarItem(id, itemId, qty);
      setQtdLocais(prev => { const { [itemId]: _, ...rest } = prev; return rest; });
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAcao(false);
    }
  }

  async function handleRemoverItem(itemId) {
    setAcao(true);
    try {
      await api.removerItem(id, itemId);
      await carregar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setAcao(false);
    }
  }

  if (carregando) return <p>Carregando...</p>;
  if (!pedido) return <p style={{ color: 'red' }}>{erro || 'Pedido não encontrado.'}</p>;

  return (
    <div className="page">
      <button onClick={() => navigate('/pedidos')} style={{ marginBottom: 16, padding: '8px 14px', minHeight: 40 }}>← Voltar</button>

      <h2>
        Pedido{' '}
        <span style={{ color: STATUS_COR[pedido.status], fontSize: 14, fontWeight: 'bold' }}>
          {STATUS_LABEL[pedido.status]}
        </span>
      </h2>
      {pedido.mesa && (
        <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Mesa {pedido.mesa}</p>
      )}
      <p style={{ color: 'var(--c-text-sub)', fontSize: 13 }}>
        Criado em: {new Date(pedido.created_at).toLocaleString('pt-BR')}
      </p>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}

      {estoqueErros && estoqueErros.length > 0 && (
        <div style={{ background: 'var(--c-err-bg)', border: '1px solid var(--c-err-border)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <strong>Estoque insuficiente para os seguintes itens:</strong>
          <ul style={{ margin: '8px 0 0 16px' }}>
            {estoqueErros.map((e, i) => (
              <li key={i}>{e.product_nome}: {e.erro || e.mensagem}</li>
            ))}
          </ul>
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--c-text-sub)' }}>
            Ajuste as quantidades ou aguarde reposição e tente novamente.
          </p>
        </div>
      )}

      {pedido.estoque_erros && pedido.estoque_erros.length > 0 && (
        <div style={{ background: 'var(--c-warn-bg)', border: '1px solid var(--c-warn-border)', padding: 12, borderRadius: 6, marginBottom: 16 }}>
          <strong>Erros na baixa de estoque:</strong>
          <ul style={{ margin: '8px 0 0 16px' }}>
            {pedido.estoque_erros.map((e, i) => (
              <li key={i}>{e.product_nome}: {e.erro}</li>
            ))}
          </ul>
        </div>
      )}

      <h3>Itens</h3>
      {pedido.itens.length === 0 ? (
        <p>Nenhum item adicionado.</p>
      ) : (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 260 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid var(--c-border)' }}>Produto</th>
                <th style={{ textAlign: 'center', padding: 8, borderBottom: '1px solid var(--c-border)' }}>
                  {pedido.status === 'rascunho' ? 'Quantidade' : 'Qtd'}
                </th>
                {pedido.status === 'rascunho' && (
                  <th style={{ padding: 8, borderBottom: '1px solid var(--c-border)' }}></th>
                )}
              </tr>
            </thead>
            <tbody>
              {pedido.itens.map(item => {
                const qtdLocal = qtdLocais[item.id];
                const qtdExibida = qtdLocal !== undefined ? qtdLocal : item.quantidade;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--c-border-light)' }}>
                    <td style={{ padding: '10px 8px' }}>{item.product_nome}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                      {pedido.status === 'rascunho' ? (
                        <div className="qtd-row">
                          <button
                            className="btn-qtd"
                            onClick={() => {
                              const nova = parseInt(qtdExibida) - 1;
                              if (nova <= 0) handleRemoverItem(item.id);
                              else handleAjustarItem(item.id, nova);
                            }}
                            disabled={acao}
                          >
                            −
                          </button>
                          <input
                            className="input-qtd"
                            type="number"
                            min="1"
                            value={qtdExibida}
                            onChange={e => setQtdLocais(prev => ({ ...prev, [item.id]: e.target.value }))}
                            onBlur={e => handleAjustarItem(item.id, e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAjustarItem(item.id, qtdExibida)}
                          />
                          <button
                            className="btn-qtd"
                            onClick={() => handleAjustarItem(item.id, parseInt(qtdExibida) + 1)}
                            disabled={acao}
                          >
                            +
                          </button>
                          <span style={{ color: 'var(--c-text-muted)', fontSize: 12, marginLeft: 2 }}>{item.unidade}</span>
                        </div>
                      ) : (
                        <span>{item.quantidade} {item.unidade}</span>
                      )}
                    </td>
                    {pedido.status === 'rascunho' && (
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleRemoverItem(item.id)}
                          disabled={acao}
                          style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, minHeight: 36 }}
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="acoes-row">
        {pedido.status === 'rascunho' && (
          <button
            className="btn-acao"
            onClick={handleConfirmar}
            disabled={acao}
            style={{ background: '#3b82f6', color: '#fff' }}
          >
            {acao ? 'Aguarde...' : 'Confirmar Pedido'}
          </button>
        )}
        {pedido.status === 'confirmado' && (
          <>
            <button
              className="btn-acao"
              onClick={handleReabrir}
              disabled={acao}
              style={{ background: '#f59e0b', color: '#fff' }}
            >
              {acao ? 'Aguarde...' : '← Reabrir Pedido'}
            </button>
            <button
              className="btn-acao"
              onClick={handlePagar}
              disabled={acao}
              style={{ background: '#22c55e', color: '#fff' }}
            >
              {acao ? 'Processando...' : 'Marcar como Pago'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
