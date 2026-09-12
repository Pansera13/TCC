import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';

interface Props {
  onResult: (text: string) => void;
  onUnavailable: (reason: string) => void;
}

/**
 * Camera-based scanner for QR (NFC-e) and EAN/GTIN barcodes. Prefers the rear
 * camera and lets the user switch cameras. Uses the native BarcodeDetector when
 * available, falling back to @zxing/browser. Calls onUnavailable when the camera
 * cannot be used so the caller can offer manual entry.
 */
export default function CameraScanner({ onResult, onUnavailable }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  // Enumerate cameras once permission is granted; prefer the rear camera.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onUnavailable('Este dispositivo/navegador não expõe a câmera.');
        return;
      }
      try {
        // Ask for the rear camera first to trigger the permission prompt.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        stream.getTracks().forEach((t) => t.stop());
        const list = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === 'videoinput',
        );
        if (cancelled) return;
        setDevices(list);
        const rear = list.find((d) => /back|rear|traseira|environment/i.test(d.label));
        setDeviceId(rear?.deviceId ?? list[0]?.deviceId);
      } catch {
        onUnavailable('Permissão de câmera negada ou câmera indisponível.');
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start decoding whenever the selected device changes.
  useEffect(() => {
    if (!deviceId || !videoRef.current) return;
    const reader = new BrowserMultiFormatReader();
    let stopped = false;
    reader
      .decodeFromVideoDevice(deviceId, videoRef.current, (result) => {
        if (result && !stopped) {
          stopped = true;
          controlsRef.current?.stop();
          onResult(result.getText());
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
        if (stopped) controls.stop();
      })
      .catch(() => onUnavailable('Não foi possível iniciar a câmera.'));
    return () => {
      stopped = true;
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId]);

  return (
    <div className="scanner">
      <video ref={videoRef} className="scanner-video" muted playsInline />
      {devices.length > 1 && (
        <select
          className="scanner-select"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
        >
          {devices.map((d, i) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `Câmera ${i + 1}`}
            </option>
          ))}
        </select>
      )}
      <p className="muted center-text">Aponte para o QR Code da NFC-e ou o código de barras.</p>
    </div>
  );
}
