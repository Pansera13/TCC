import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError, type ImportPreview, type NfeItem } from '../api';

type EditableItem = NfeItem & { key: number };

let counter = 0;
const withKeys = (items: NfeItem[]): EditableItem[] => items.map((it) => ({ ...it, key: counter++ }));
const blankItem = (): EditableItem => ({
  key: counter++,
  description: '',
  gtin: null,
  quantity: 1,
  unit: 'UN',
  unitValue: null,
});

export default function ReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preview = (location.state as { preview?: ImportPreview } | null)?.preview;

  const [items, setItems] = useState<EditableItem[]>(preview ? withKeys(preview.items) : []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!preview) {
    return (
      <div className="page">
        <p className="error">Nenhuma nota para revisar.</p>
        <button className="btn btn-primary" onClick={() => navigate('/escanear')}>Escanear</button>
      </div>
    );
  }

  function update(key: number, patch: Partial<NfeItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function remove(key: number) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function add() {
    setItems((prev) => [...prev, blankItem()]);
  }

  async function confirm() {
    setError(null);
    const clean = items
      .map((it) => ({
        description: it.description.trim(),
        gtin: it.gtin?.trim() || null,
        quantity: Number(it.quantity),
        unit: (it.unit || 'UN').toUpperCase(),
        unitValue: it.unitValue ?? null,
      }))
      .filter((it) => it.description && it.quantity > 0);
    if (clean.length === 0) {
      setError('Adicione ao menos um item válido (descrição e quantidade).');
      return;
    }
    setBusy(true);
    try {
      const { result } = await api.confirm({
        accessKey: preview!.accessKey,
        issuedAt: preview!.issuedAt,
        source: preview!.source,
        items: clean,
      });
      navigate('/', {
        replace: true,
        state: { flash: `Nota importada: ${result.itemsImported} itens, ${result.productsCreated} produtos novos.` },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Falha ao confirmar a importação.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Revisar nota</h1>
      <p className="muted">
        Chave {preview.accessKey} · origem {preview.source}
      </p>

      {preview.alreadyImported && (
        <p className="warn">Esta nota já foi importada anteriormente — confirmar novamente será bloqueado.</p>
      )}
      {preview.items.length === 0 && (
        <p className="warn">Sem dados automáticos da nota. Adicione os itens manualmente abaixo.</p>
      )}
      {error && <p className="error">{error}</p>}

      <div className="review-list">
        {items.map((it) => (
          <div className="card review-item" key={it.key}>
            <label>Descrição
              <input value={it.description} onChange={(e) => update(it.key, { description: e.target.value })} />
            </label>
            <div className="row3">
              <label>Qtd
                <input
                  type="number" min="0" step="any"
                  value={it.quantity}
                  onChange={(e) => update(it.key, { quantity: Number(e.target.value) })}
                />
              </label>
              <label>Un.
                <input value={it.unit} onChange={(e) => update(it.key, { unit: e.target.value })} />
              </label>
              <label>GTIN
                <input value={it.gtin ?? ''} onChange={(e) => update(it.key, { gtin: e.target.value || null })} />
              </label>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => remove(it.key)}>Remover</button>
          </div>
        ))}
      </div>

      <button className="btn" onClick={add}>+ Adicionar item</button>

      <div className="actions sticky-actions">
        <button className="btn btn-primary" onClick={confirm} disabled={busy}>
          {busy ? 'Confirmando...' : 'Confirmar entrada'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/escanear')} disabled={busy}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
