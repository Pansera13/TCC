import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError, type Movement, type Product } from '../api';

const TYPE_LABEL: Record<Movement['type'], string> = {
  in: 'Entrada',
  out: 'Saída',
  adjust: 'Ajuste',
};

export default function ProductPage() {
  const { id } = useParams();
  const productId = Number(id);
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ description: '', gtin: '', unit: '' });

  const reload = useCallback(async () => {
    const [p, m] = await Promise.all([api.getProduct(productId), api.listMovements(productId)]);
    setProduct(p.product);
    setMovements(m.movements);
    setForm({ description: p.product.description, gtin: p.product.gtin ?? '', unit: p.product.unit });
  }, [productId]);

  useEffect(() => {
    reload().catch(() => setError('Produto não encontrado.'));
  }, [reload]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Operação falhou.');
    }
  }

  async function onMovement(type: 'in' | 'out') {
    const raw = window.prompt(`Quantidade para ${TYPE_LABEL[type].toLowerCase()}:`);
    if (!raw) return;
    const qty = Number(raw.replace(',', '.'));
    if (!(qty > 0)) return setError('Quantidade inválida.');
    await run(() => api.addMovement(productId, type, qty));
  }

  async function onAdjust() {
    const raw = window.prompt('Novo saldo:');
    if (raw === null) return;
    const bal = Number(raw.replace(',', '.'));
    if (!(bal >= 0)) return setError('Saldo inválido.');
    await run(() => api.adjust(productId, bal));
  }

  async function onSaveEdit() {
    await run(() =>
      api.updateProduct(productId, {
        description: form.description,
        gtin: form.gtin || null,
        unit: form.unit,
      }),
    );
    setEditing(false);
  }

  if (error && !product) return <div className="page"><p className="error">{error}</p></div>;
  if (!product) return <div className="page"><p className="muted">Carregando...</p></div>;

  return (
    <div className="page">
      <Link to="/" className="back">← Catálogo</Link>

      <div className="card">
        {editing ? (
          <div className="stack">
            <label>Descrição<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>GTIN<input value={form.gtin} onChange={(e) => setForm({ ...form, gtin: e.target.value })} /></label>
            <label>Unidade<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
            <div className="actions">
              <button className="btn btn-primary" onClick={onSaveEdit}>Salvar</button>
              <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="page-head">
              <h1>{product.description}</h1>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Editar</button>
            </div>
            <p className="muted">{product.gtin ? `GTIN ${product.gtin}` : 'Sem GTIN'} · Unidade {product.unit}</p>
            <p className="balance">Saldo atual: <strong>{product.balance} {product.unit}</strong></p>
          </>
        )}
      </div>

      <div className="actions">
        <button className="btn" onClick={() => onMovement('in')}>+ Entrada</button>
        <button className="btn" onClick={() => onMovement('out')}>− Saída</button>
        <button className="btn" onClick={onAdjust}>Ajustar saldo</button>
      </div>
      {error && <p className="error">{error}</p>}

      <h2>Histórico</h2>
      {movements.length === 0 && <p className="muted">Sem movimentações.</p>}
      {movements.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Data</th><th>Tipo</th><th className="num">Qtd</th><th>Origem</th></tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt.replace(' ', 'T') + 'Z').toLocaleString()}</td>
                <td>{TYPE_LABEL[m.type]}</td>
                <td className="num">{m.quantity}</td>
                <td>{m.source === 'nfe' ? `NFC-e${m.noteId ? ` #${m.noteId}` : ''}` : 'Manual'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
