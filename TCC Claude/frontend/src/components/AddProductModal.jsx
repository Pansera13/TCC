import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats as Fmt } from 'html5-qrcode';
import api from '../services/api';

const INITIAL_FORM = { nome: '', quantidade: '', unidade: 'UN', categoria: '', fornecedor: '', codigo_barras: '' };
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
  const [scanMode, setScanMode] = useState('qr'); // 'qr' | 'barcode'
  const [chaveInput, setChaveInput] = useState('');

  // barcode lookup
  const [barcodeLoading, setBarcodeLoading] = useState(false);
  const [barcodeWarning, setBarcodeWarning] = useState('');
  const [barcodeImagem, setBarcodeImagem] = useState(null);

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
      setScanMode('qr');
      startScanner('qr');
    }
    return () => {
      stopScanner();
    };
  }, [mode]);

  async function switchScanMode(newMode) {
    setScanMode(newMode);
    await stopScanner();
    setCameraError('');
    startScanner(newMode);
  }

  async function startScanner(currentScanMode = 'qr') {
    await new Promise(r => setTimeout(r, 100)); // wait for DOM
    if (!scannerRef.current) return;

    // Restringir os formatos deixa a leitura muito mais rápida (por padrão ele tenta todos)
    const formatsToSupport = currentScanMode === 'barcode'
      ? [Fmt.EAN_13, Fmt.EAN_8, Fmt.UPC_A, Fmt.UPC_E, Fmt.CODE_128, Fmt.ITF]
      : [Fmt.QR_CODE];
    const html5Qrcode = new Html5Qrcode('nfe-scanner-region', {
      formatsToSupport,
      useBarCodeDetectorIfSupported: true,
      verbose: false,
    });
    scannerInstanceRef.current = html5Qrcode;

    const timeout = setTimeout(() => {
      stopScanner();
      setCameraStep('error');
      setCameraError('Nenhum código detectado em 30 segundos. Tente novamente ou use o modo Manual.');
    }, 30000);
    setScanTimeout(timeout);

    const qrbox = currentScanMode === 'barcode'
      ? (w, h) => ({ width: Math.floor(w * 0.88), height: Math.floor(h * 0.28) })
      : (w, h) => { const s = Math.floor(Math.min(w, h) * 0.72); return { width: s, height: s }; };

    try {
      await html5Qrcode.start(
        { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' }] },
        {
          fps: 20,
          qrbox,
          disableFlip: true,
          rememberLastUsedCamera: false,
        },
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
      const msg = err.toString();
      if (msg.includes('Permission')) {
        setCameraError('Permissão de câmera negada. Permita o acesso à câmera nas configurações do navegador.');
      } else if (msg.includes('streaming not supported') || msg.includes('mediaDevices') || location.protocol !== 'https:') {
        setCameraError('A câmera requer HTTPS. Acesse o sistema via https:// (não http://).');
      } else {
        setCameraError('Não foi possível acessar a câmera: ' + msg);
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
      const match44 = raw.match(/\d{44}/);

      if (match44) {
        // NF-e: chave de acesso com 44 dígitos
        const { data } = await api.get(`/api/nfe/${encodeURIComponent(match44[0])}`);
        setNfeProducts(data.produtos);
        setCameraStep('confirm');
        return;
      }

      // EAN-8, EAN-12, EAN-13, EAN-14 — busca dados do produto via API
      const ean = raw.replace(/\D/g, '');
      if (ean.length >= 8 && ean.length <= 14) {
        setForm(f => ({ ...f, codigo_barras: ean }));
        setBarcodeWarning('');
        setBarcodeImagem(null);
        setMode('manual');
        lookupByBarcode(ean); // atualiza o form em background
        return;
      }

      // Código não reconhecido
      setCameraStep('error');
      setCameraError(
        `Código lido: "${raw}"\n\nUse o modo QR Code para escanear o QR da NF-e, ou Código de Barras para escanear o EAN do produto.`
      );
    } catch (err) {
      setCameraStep('error');
      setCameraError(err.response?.data?.message || err.message || 'Erro ao consultar a NF-e.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Barcode lookup ────────────────────────────────────────────
  async function lookupByBarcode(codigo) {
    setBarcodeLoading(true);
    setBarcodeWarning('');
    setBarcodeImagem(null);
    try {
      const { data } = await api.get(`/api/products/barcode/${encodeURIComponent(codigo)}`);
      setForm(f => ({
        ...f,
        nome: data.nome || f.nome,
        categoria: data.categoria || f.categoria,
        fornecedor: data.marca || f.fornecedor,
      }));
      if (data.imagem) setBarcodeImagem(data.imagem);
      if (data.jaCadastrado) {
        setBarcodeWarning(`⚠️ Este produto já está no seu estoque (${data.produtoExistente?.nome || ''}).`);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setBarcodeWarning('Produto não encontrado nas bases de dados. Preencha manualmente.');
      } else {
        setBarcodeWarning(err.response?.data?.message || 'Não foi possível buscar o produto. Preencha manualmente.');
      }
    } finally {
      setBarcodeLoading(false);
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
        codigo_barras: form.codigo_barras.trim() || null,
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
          <button
            onClick={() => { setChaveInput(''); setMode('chave'); }}
            className="col-span-2 flex flex-col items-center gap-2 py-4 px-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition group"
          >
            <span className="text-3xl">🔑</span>
            <span className="font-semibold text-sm text-gray-700 dark:text-gray-200 group-hover:text-purple-700 dark:group-hover:text-purple-300">Digitar chave de acesso</span>
            <span className="text-xs text-gray-400 text-center">Cole ou digite a chave de acesso da NF-e (44 dígitos)</span>
          </button>
        </div>
      </div>
    );
  }

  // ─── Chave de acesso manual ────────────────────────────────────
  function renderChave() {
    const digits = chaveInput.replace(/\D/g, '');
    const isEan = digits.length >= 8 && digits.length <= 14;
    const ready = digits.length === 44 || isEan;

    async function handleConsultar(e) {
      e.preventDefault();
      setCameraStep('scanning');
      setCameraError('');
      await handleScanResult(digits);
    }

    return (
      <form onSubmit={handleConsultar} className="flex flex-col gap-4 py-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Digite o código de barras do produto (8 a 14 dígitos) ou os 44 dígitos da chave de acesso da NF-e.
        </p>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Chave de acesso <span className="text-red-500">*</span>
          </label>
          <textarea
            className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 outline-none transition font-mono resize-none
              ${ready ? 'border-green-400 focus:border-green-500' : 'border-gray-200 dark:border-gray-700 focus:border-purple-500'}`}
            rows={3}
            value={chaveInput}
            onChange={e => setChaveInput(e.target.value)}
            placeholder="3524 1234 5678 9012 3456 7890 1234 5678 9012 3456 78"
            autoFocus
          />
          <span className={`text-xs text-right ${ready ? 'text-green-500' : 'text-gray-400'}`}>
            {digits.length}/44 dígitos{ready ? ' ✓' : ''}
          </span>
        </div>
        {cameraStep === 'error' && cameraError && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {cameraError}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => { setCameraStep('scanning'); setCameraError(''); setMode(null); }}
            className="flex-1 px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            Voltar
          </button>
          <button
            type="submit"
            disabled={!ready || loading}
            className="flex-1 px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg transition font-medium"
          >
            {loading ? 'Consultando…' : (isEan ? 'Buscar produto' : 'Consultar NF-e')}
          </button>
        </div>
      </form>
    );
  }

  // ─── Manual form ───────────────────────────────────────────────
  function renderManual() {
    const VALID_EAN_LENGTHS = new Set([8, 12, 13, 14]);

    return (
      <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 py-2">
        {errors._global && (
          <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {errors._global}
          </div>
        )}

        {/* Código de barras + busca automática */}
        <Field label="Código de barras (EAN)">
          <div className="flex gap-2 items-center">
            <input
              className={inputCls(false) + ' flex-1'}
              value={form.codigo_barras}
              inputMode="numeric"
              maxLength={14}
              placeholder="Ex.: 7891000100103"
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '');
                setForm(f => ({ ...f, codigo_barras: v }));
                setBarcodeWarning('');
                setBarcodeImagem(null);
              }}
              onBlur={() => {
                if (VALID_EAN_LENGTHS.has(form.codigo_barras.length)) {
                  lookupByBarcode(form.codigo_barras);
                }
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (VALID_EAN_LENGTHS.has(form.codigo_barras.length)) {
                    lookupByBarcode(form.codigo_barras);
                  }
                }
              }}
            />
            {barcodeLoading && (
              <span className="text-xs text-purple-500 shrink-0 animate-pulse">Buscando…</span>
            )}
          </div>
        </Field>

        {/* Imagem do produto */}
        {barcodeImagem && (
          <div className="flex justify-center">
            <img
              src={barcodeImagem}
              alt="Imagem do produto"
              className="h-24 w-24 object-contain rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
              onError={() => setBarcodeImagem(null)}
            />
          </div>
        )}

        {/* Aviso de busca */}
        {barcodeWarning && (
          <div className={`text-xs rounded-lg px-3 py-2 border ${
            barcodeWarning.startsWith('⚠️')
              ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
              : 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            {barcodeWarning}
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
              onClick={() => { setCameraStep('scanning'); setCameraError(''); startScanner(scanMode); }}
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
        <div className="flex gap-2">
          <button
            onClick={() => scanMode !== 'qr' && switchScanMode('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition font-medium
              ${scanMode === 'qr'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <span>⬛</span> QR Code
          </button>
          <button
            onClick={() => scanMode !== 'barcode' && switchScanMode('barcode')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-lg border transition font-medium
              ${scanMode === 'barcode'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
          >
            <span>▬</span> Código de Barras
          </button>
        </div>
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
    : mode === 'chave' ? 'Chave de Acesso'
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
          {mode === 'chave' && cameraStep !== 'confirm' && renderChave()}
          {mode === 'chave' && cameraStep === 'confirm' && renderCamera()}
        </div>
      </div>
    </div>
  );
}
