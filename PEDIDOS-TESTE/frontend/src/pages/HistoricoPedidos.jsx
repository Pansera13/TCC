import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const STATUS_COR   = { rascunho: '#f59e0b', confirmado: '#3b82f6', pago: '#22c55e' };
const STATUS_LABEL = { rascunho: 'Rascunho', confirmado: 'Confirmado', pago: 'Pago' };

export default function HistoricoPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos]     = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]           = useState('');

  useEffect(() => {
    api.listarPedidos()
      .then(setPedidos)
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="page">
      <button onClick={() => navigate('/pedidos')} style={{ marginBottom: 16, padding: '6px 14px', minHeight: 40 }}>
        ← Voltar às Mesas
      </button>
      <h2>Histórico de Pedidos</h2>

      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      {carregando && <p>Carregando...</p>}

      {!carregando && pedidos.length === 0 && (
        <p style={{ color: 'var(--c-text-muted)' }}>Nenhum pedido registrado ainda.</p>
      )}

      {pedidos.map(p => (
        <Link
          key={p.id}
          to={`/pedidos/${p.id}`}
          style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}
        >
          <div style={{
            border: '1px solid var(--c-border)', borderRadius: 10, padding: 16, marginBottom: 10,
            background: 'var(--c-surface)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              {p.mesa && (
                <span style={{ fontWeight: 700, marginRight: 10 }}>Mesa {p.mesa}</span>
              )}
              <span style={{ fontSize: 12, color: 'var(--c-text-muted)' }}>
                {new Date(p.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <span style={{ fontWeight: 600, color: STATUS_COR[p.status] || '#888' }}>
              {STATUS_LABEL[p.status] || p.status}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
