import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrowserMultiFormatReader } from '@zxing/browser';
import CameraScanner from '../components/CameraScanner';
import { api, ApiError, type ImportPreview } from '../api';

type Mode = 'camera' | 'manual';

export default function ScanPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('camera');
  const [manualCode, setManualCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function goReview(preview: ImportPreview) {
    navigate('/revisar', { state: { preview } });
  }

  // Manual entry with the scanned/typed key but no automatic data: go to review
  // with an empty item list so the user can type items (SEFAZ-down path).
  function goManualEntry(accessKey: string) {
    goReview({ accessKey, issuedAt: null, source: 'manual', alreadyImported: false, items: [] });
  }

  async function importByCode(code: string) {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const { preview } = await api.preview(code);
      goReview(preview);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 503 || err.code.startsWith('sefaz') || err.code === 'uf_not_supported')) {
        // Automatic source failed: keep the key, offer manual entry.
        const digits = code.replace(/\D/g, '').match(/\d{44}/)?.[0];
        setError(`${err.message} Você pode inserir os itens manualmente.`);
        if (digits) {
          setInfo('Chave lida preservada. Continuando por entrada manual...');
          goManualEntry(digits);
          return;
        }
      } else {
        setError(err instanceof ApiError ? err.message : 'Falha ao consultar a nota.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function onManualSubmit() {
    const digits = manualCode.replace(/\D/g, '');
    if (digits.length !== 44) {
      setError('A chave de acesso deve ter 44 dígitos.');
      return;
    }
    await importByCode(digits);
  }

  // Import a photo (from the gallery or camera) and decode a QR/barcode from it.
  // Useful when the live camera is unavailable (e.g. insecure context on mobile).
  async function onImageFile(file: File) {
    setError(null);
    setInfo(null);
    setBusy(true);
    const url = URL.createObjectURL(file);
    try {
      const result = await new BrowserMultiFormatReader().decodeFromImageUrl(url);
      await importByCode(result.getText());
    } catch {
      setError(
        'Não foi possível ler um QR Code ou código de barras na foto. ' +
          'Tente uma imagem mais nítida ou use a chave de acesso.',
      );
    } finally {
      URL.revokeObjectURL(url);
      setBusy(false);
    }
  }

  async function onXmlFile(file: File) {
    setError(null);
    setBusy(true);
    try {
      const xml = await file.text();
      const { preview } = await api.previewXml(xml);
      goReview(preview);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'XML inválido.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1>Importar nota</h1>

      <div className="tabs">
        <button className={`tab ${mode === 'camera' ? 'active' : ''}`} onClick={() => setMode('camera')}>
          Câmera
        </button>
        <button className={`tab ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
          Chave / XML
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {info && <p className="muted">{info}</p>}
      {busy && <p className="muted">Consultando...</p>}

      {mode === 'camera' && (
        <div className="stack">
          <CameraScanner
            onResult={importByCode}
            onUnavailable={(reason) => {
              setError(`${reason} Importe uma foto abaixo ou use a chave / XML.`);
            }}
          />
          <label className="filelabel">
            Ou importe uma foto do QR Code / código de barras
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0])}
            />
          </label>
        </div>
      )}

      {mode === 'manual' && (
        <div className="card stack">
          <label>
            Chave de acesso (44 dígitos)
            <input
              inputMode="numeric"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="0000 0000 0000 ..."
            />
          </label>
          <button className="btn btn-primary" onClick={onManualSubmit} disabled={busy}>
            Consultar nota
          </button>

          <hr />

          <label className="filelabel">
            Ou envie o XML da nota
            <input
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={(e) => e.target.files?.[0] && onXmlFile(e.target.files[0])}
            />
          </label>
        </div>
      )}
    </div>
  );
}
