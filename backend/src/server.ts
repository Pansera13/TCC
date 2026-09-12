import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { createApp } from './app.js';
import { getDb } from './db/index.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0'; // reachable from other devices on the LAN

// Ensure the DB is opened and migrated at boot.
getDb();

const app = createApp();

// Optional HTTPS for LAN testing (camera requires a secure context on phones).
// Provide TLS_KEY_FILE and TLS_CERT_FILE (e.g. generated with mkcert).
const keyFile = process.env.TLS_KEY_FILE;
const certFile = process.env.TLS_CERT_FILE;

if (keyFile && certFile && existsSync(keyFile) && existsSync(certFile)) {
  const server = createHttpsServer(
    { key: readFileSync(keyFile), cert: readFileSync(certFile) },
    app,
  );
  server.listen(PORT, HOST, () => {
    console.log(`API (HTTPS) ouvindo em https://${HOST}:${PORT}`);
  });
} else {
  const server = createHttpServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`API (HTTP) ouvindo em http://${HOST}:${PORT}`);
  });
}
