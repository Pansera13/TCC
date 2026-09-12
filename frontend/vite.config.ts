import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Backend API base used during development (proxied to avoid CORS/mixed-content issues).
const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

// HTTPS is opt-in (set VITE_HTTPS=1). It is only needed to test the camera on a
// phone over the LAN (getUserMedia requires a secure context, and http://<LAN-IP>
// is treated as insecure). On the PC, http://localhost is already a secure
// context, so the camera works over plain HTTP without the self-signed-cert
// browser warning ("sua conexao nao e privada").
const USE_HTTPS = process.env.VITE_HTTPS === '1' || process.env.VITE_HTTPS === 'true';

export default defineConfig({
  plugins: [
    react(),
    // Only enable the self-signed HTTPS cert when explicitly requested.
    ...(USE_HTTPS ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Estoque NFC-e',
        short_name: 'Estoque',
        description: 'Controle de estoque automatico por leitura de QR Code de NFC-e',
        theme_color: '#0f766e',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
