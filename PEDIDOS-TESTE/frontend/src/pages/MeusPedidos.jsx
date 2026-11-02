import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const STATUS_COR   = { rascunho: '#f59e0b', confirmado: '#3b82f6' };
const STATUS_LABEL = { rascunho: 'Rascunho', confirmado: 'Confirmado' };

export default function MeusPedidos() {
  const navigate = useNavigate();
  const [mesas, setMesas]     = useState([]);
  const [modal, setModal]     = useState(null);
  const [pagando, setPagando] = useState(false);
  const [erroModal, setErroModal] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    try { setMesas(await api.getMesasOcupadas()); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirModal(info) { setErroModal(''); setModal(info); }
  function fecharModal()    { setModal(null); setErroModal(''); }

  async function handlePagar() {
    if (!modal) return;
    setPagando(true); setErroModal('');
    try {
      if (modal.status === 'rascunho') await api.confirmarPedido(modal.pedido_id);
      await api.pagarPedido(modal.pedido_id);
      fecharModal(); await carregar();
    } catch (err) {
      if (err.status === 409) navigate(`/pedidos/${modal.pedido_id}`);
      else setErroModal(err.message);
    } finally { setPagando(false); }
  }

  if (carregando) return <p className="page">Carregando mesas...</p>;

  const mesaMap = {};
  for (const m of mesas) mesaMap[m.mesa] = m;

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0 }}>Mesas</h2>
        <button
          onClick={() => navigate('/pedidos/historico')}
          style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-btn)', color: 'var(--c-text)', cursor: 'pointer' }}
        >
          Histórico
        </button>
      </div>

      <div className="mesa-grid">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
          const info = mesaMap[num];
          const ocupada = !!info;
          const cor = ocupada ? STATUS_COR[info.status] : '#16a34a';
          const bg  = ocupada ? (info.status === 'rascunho' ? 'var(--c-mesa-ras)' : 'var(--c-mesa-conf)') : 'var(--c-mesa-livre)';

          return (
            <button
              key={num}
              onClick={() => ocupada ? abrirModal(info) : navigate(`/pedidos/novo?mesa=${num}`)}
              className="mesa-btn"
              style={{ border: `2px solid ${cor}`, background: bg, color: cor }}
            >
              {num}
              <div className="mesa-btn-sub" style={{ fontSize: 11, fontWeight: 500, marginTop: 6 }}>
                {ocupada ? STATUS_LABEL[info.status] : 'Livre'}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--c-text-muted)' }}>
        Mesa livre = novo pedido · Mesa ocupada = gerenciar
      </p>

      {modal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 20 }}>Mesa {modal.mesa}</h3>
            <p style={{ margin: '0 0 20px', color: STATUS_COR[modal.status], fontWeight: 600, fontSize: 14 }}>
              {STATUS_LABEL[modal.status]}
            </p>

            {erroModal && <p style={{ color: 'red', fontSize: 13, marginBottom: 12 }}>{erroModal}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                onClick={() => { fecharModal(); navigate(`/pedidos/${modal.pedido_id}`); }}
                className="modal-action-btn"
              >
                🔍&nbsp; Verificar pedido
              </button>
              <button
                onClick={() => { fecharModal(); navigate(`/pedidos/novo?mesa=${modal.mesa}`); }}
                className="modal-action-btn"
              >
                ➕&nbsp; Adicionar pedido
              </button>
              <button
                onClick={handlePagar}
                disabled={pagando}
                className="modal-action-btn modal-action-btn-green"
              >
                {pagando ? 'Processando...' : '💳  Pagar e liberar mesa'}
              </button>
            </div>

            <button
              onClick={fecharModal}
              style={{ marginTop: 14, width: '100%', padding: 8, border: 'none', background: 'none', color: 'var(--c-text-muted)', cursor: 'pointer', fontSize: 13 }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
