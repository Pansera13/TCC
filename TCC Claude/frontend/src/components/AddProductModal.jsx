import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../services/api';

const INITIAL_FORM = { nome: '', quantidade: '', unidade: 'UN', categoria: '', fornecedor: '' };
const UNIDADES = ['UN', 'CX', 'PCT', 'KG', 'G', 'T', 'L', 'ML', 'M', 'CM'];

function Field({ label, required, children, error }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition
   ${err ? 'border-red-400 focus:border-red-500' : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'}`;

export default function AddProductModal({ onClose, onProductsAdded, categories = [] }) {
  const [mode, setMode] = useState(null); // null | 'manual' | 'camera'
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // camera states
  const [cameraStep, setCameraStep] = useState('scanning'); // 'scanning' | 'confirm' | 'error'
  const [cameraError, setCameraError] = useState('');
  const [nfeProducts, setNfeProducts] = useState([]);
  const [scanTimeout, setScanTimeout] = useState(null);

  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Start/stop camera when mode changes
  useEffect(() => {
    if (mode === 'camera') {
      setCameraStep('scanning');
      setCameraError('');
      setNfeProducts([]);
      startScanner();
    }
    return () => {
      stopScanner();
    };
  }, [mode]);

  async function startScanner() {
    await new Promise(r => setTimeout(r, 100)); // wait for DOM
    if (!scannerRef.current) return;

    const html5Qrcode = new Html5Qrcode('nfe-scanner-region');
    scannerInstanceRef.current = html5Qrcode;

    const timeout = setTimeout(() => {
      stopScanner();
      setCameraStep('error');
      setCameraError('Nenhum código detectado em 30 segundos. Tente novamente ou use o modo Manual.');
    }, 30000);
    setScanTimeout(timeout);

    try {
      await html5Qrcode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          clearTimeout(timeout);
          await stopScanner();
          await handleScanResult(decodedText);
        },
        () => {} // ignore per-frame errors
      );
    } catch (err) {
      clearTimeout(timeout);
      setCameraStep('error');
      if (err.toString().includes('Permission')) {
        setCameraError('Permissão de câmera negada. A câmera é necessária para esta função.');
      } else {
        setCameraError('Não foi possível acessar a câmera: ' + err.toString());
      }
    }
  }

  async function stopScanner() {
    if (scanTimeout) { clearTimeout(scanTimeout); setScanTimeout(null); }
    const inst = scannerInstanceRef.current;
    if (inst) {
      try {
        const state = inst.getState();
        if (state === 2) await inst.stop(); // 2 = SCANNING
      } catch { /* ignore */ }
      scannerInstanceRef.current = null;
    }
  }

  async function handleScanResult(raw) {
    setLoading(true);
    try {
      // Extract 44-digit access key from raw value (URL or plain key)
      const match = raw.match(/\d{44}/);
      const chave = match ? match[0] : raw;
      const { data } = await api.get(`/api/nfe/${encodeURIComponent(chave)}`);
      setNfeProducts(data.produtos);
      setCameraStep('confirm');
    } catch (err) {
      setCameraStep('error');
      const msg = err.response?.data?.message || err.message || 'Erro ao consultar a NF-e.';
      setCameraError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ─── Manual form ───────────────────────────────────────────────
  function validateForm() {
    const e = {};
    if (!form.nome.trim()) e.nome = 'Nome é obrigatório.';
    const qty = parseFloat(form.quantidade);
    if (!form.quantidade.trim()) e.quantidade = 'Quantidade é obrigatória.';
    else if (isNaN(qty) || qty <= 0) e.quantidade = 'Quantidade deve ser um número maior que zero.';
    if (!form.unidade) e.unidade = 'Unidade é obrigatória.';
    return e;
  }

  async function handleManualSubmit(e) {
    e.preventDefault();
    const errs = validateForm();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      await api.post('/api/products', {
        nome: form.nome.trim(),
        quantidade: parseFloat(form.quantidade),
        unidade: form.unidade,
        categoria: form.categoria.trim() || null,
        fornecedor: form.fornecedor.trim() || null,
      });
      onProductsAdded();
      onClose();
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Erro ao salvar produto.' });
    } finally {
      setLoading(false);
    }
  }

  // ─── NF-e confirm ──────────────────────────────────────────────
  async function handleConfirmNfe() {
    setLoading(true);
    try {
      await Promise.all(nfeProducts.map(p =>
        api.post('/api/products', {
          nome: p.nome,
          quantidade: p.quantidade,
          unidade: p.unidade,
          peso_kg: p.peso_kg ?? null,
          categoria: null,
        })
      ));
      onProductsAdded();
      onClose();
    } catch (err) {
      setCameraStep('error');
      setCameraError(err.response?.data?.message || 'Erro ao salvar produtos.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Mode selector ─────────────────────────────────────────────
  function renderModeSelect() {
    return (
      <div className="flex flex-col gap-4 py-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          Como deseja adicionar o produto?
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('manual')}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition group"
          >
            <span className="text-3xl">✏️</span>
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Manual</span>
            <span className="text-xs text-gray-400 text-center">Preencha os dados do produto manualmente</span>
          </button>
          <button
            onClick={() => setMode('camera')}
            className="flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition group"
          >
            <span className="text-3xl">📷</span>
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Câmera</span>
            <span className="text-xs text-gray-400 text-center">Escaneie o código de barras ou QR code da NF-e</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Manual form ───────────────────────────────────────────────
  function renderManual() {
    return (
      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 py-2">
        {errors._global && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {errors._global}
          </div>
        )}
        <Field label="Nome do produto" required error={errors.nome}>
          <input
            className={inputCls(errors.nome)}
            value={form.nome}
            onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setErrors(er => ({ ...er, nome: '' })); }}
            placeholder="Ex.: Arroz 5kg"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade" required error={errors.quantidade}>
            <input
              type="text"
              inputMode="decimal"
              className={inputCls(errors.quantidade)}
              value={form.quantidade}
              onChange={e => {
                const v = e.target.value;
                if (v === '' || /^\d*\.?\d*$/.test(v)) { setForm(f => ({ ...f, quantidade: v })); setErrors(er => ({ ...er, quantidade: '' })); }
              }}
              placeholder="0"
            />
          </Field>
          <Field label="Unidade" required error={errors.unidade}>
            <select
              className={inputCls(errors.unidade)}
              value={form.unidade}
              onChange={e => { setForm(f => ({ ...f, unidade: e.target.value })); setErrors(er => ({ ...er, unidade: '' })); }}
            >
              {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Categoria" error={errors.categoria}>
          <input
            className={inputCls(errors.categoria)}
            value={form.categoria}
            onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
            placeholder="Opcional"
            list="add-categorias-list"
          />
          <datalist id="add-categorias-list">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>
        <Field label="Fornecedor">
          <input
            className={inputCls(false)}
            value={form.fornecedor}
            onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
            placeholder="Opcional"
          />
        </Field>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => setMode(null)}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    );
  }

  // ─── Camera / NF-e scan ────────────────────────────────────────
  function renderCamera() {
    if (cameraStep === 'confirm') {
      return (
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Produtos encontrados na NF-e ({nfeProducts.length}):
          </p>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {nfeProducts.map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                <span className="text-gray-800 dark:text-gray-200 font-medium truncate flex-1">{p.nome}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-3 shrink-0">{p.quantidade} {p.unidade}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Confirme para adicionar todos os produtos ao estoque.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmNfe}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
            >
              {loading ? 'Adicionando…' : 'Confirmar e Adicionar'}
            </button>
          </div>
        </div>
      );
    }

    if (cameraStep === 'error') {
      return (
        <div className="flex flex-col items-center gap-4 py-6">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">{cameraError}</p>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setMode('manual')}
              className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Usar modo Manual
            </button>
            <button
              onClick={() => { setCameraStep('scanning'); setCameraError(''); startScanner(); }}
              className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition font-medium"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }

    // scanning
    return (
      <div className="flex flex-col gap-3 py-2">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          Aponte a câmera para o QR code ou código de barras da NF-e
        </p>
        <div
          id="nfe-scanner-region"
          ref={scannerRef}
          className="w-full rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
          style={{ minHeight: '260px' }}
        />
        {loading && (
          <p className="text-xs text-center text-purple-500">Consultando NF-e…</p>
        )}
        <button
          onClick={() => setMode(null)}
          className="mt-1 w-full px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
        >
          Voltar
        </button>
      </div>
    );
  }

  // ─── Modal shell ───────────────────────────────────────────────
  const title = mode === 'manual' ? 'Cadastro Manual'
    : mode === 'camera' ? 'Escanear NF-e'
    : 'Adicionar Produto';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            {mode && (
              <button
                onClick={() => setMode(null)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition text-xs"
                title="Voltar"
              >
                ◀
              </button>
            )}
            <h2 className="font-semibold text-gray-800 dark:text-white text-sm">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition text-lg leading-none"
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-5 pb-5 overflow-y-auto">
          {!mode && renderModeSelect()}
          {mode === 'manual' && renderManual()}
          {mode === 'camera' && renderCamera()}
        </div>
      </div>
    </div>
  );
}
