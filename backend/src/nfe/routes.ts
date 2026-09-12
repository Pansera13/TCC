import { Router } from 'express';
import { z } from 'zod';
import { badRequest } from '../errors.js';
import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../http/asyncHandler.js';
import { extractAccessKey } from './accessKey.js';
import type { NotaFiscalProvider } from './provider.js';
import { SefazHtmlProvider } from './sefazHtmlProvider.js';
import {
  confirmImport,
  getMovementSource,
  getNote,
  listNotes,
  previewFromAccessKey,
  previewFromXml,
} from './import-service.js';

// The automatic SEFAZ provider is swappable so tests can inject a fixture-backed
// fetcher without hitting the network.
let sefazProvider: NotaFiscalProvider = new SefazHtmlProvider();
export function setSefazProvider(provider: NotaFiscalProvider): void {
  sefazProvider = provider;
}

export const nfeRouter = Router();
nfeRouter.use(requireAuth);

const previewBody = z.object({ code: z.string() });

// Preview from a scanned QR/access key using the automatic SEFAZ source.
nfeRouter.post(
  '/preview',
  asyncHandler(async (req, res) => {
    const parsed = previewBody.safeParse(req.body);
    if (!parsed.success) throw badRequest('invalid_body', 'Informe a chave de acesso ou o QR lido.');
    const accessKey = extractAccessKey(parsed.data.code);
    if (!accessKey) throw badRequest('invalid_access_key', 'Chave de acesso invalida (44 digitos).');
    const preview = await previewFromAccessKey(req.user!.id, accessKey, sefazProvider, 'sefaz');
    res.json({ preview });
  }),
);

const xmlBody = z.object({ xml: z.string() });

// Preview from an uploaded XML (fallback when SEFAZ is down or for robustness).
nfeRouter.post('/preview-xml', (req, res) => {
  const parsed = xmlBody.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Envie o conteudo do XML.');
  res.json({ preview: previewFromXml(req.user!.id, parsed.data.xml) });
});

const itemSchema = z.object({
  description: z.string(),
  gtin: z.string().nullish(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  unitValue: z.number().nullish(),
});

const confirmBody = z.object({
  accessKey: z.string(),
  issuedAt: z.string().nullish(),
  source: z.string().default('manual'),
  items: z.array(itemSchema),
});

// Confirm the (possibly manually edited) items and effect the stock entry.
nfeRouter.post('/confirm', (req, res) => {
  const parsed = confirmBody.safeParse(req.body);
  if (!parsed.success) throw badRequest('invalid_body', 'Dados da importacao invalidos.');
  const result = confirmImport(req.user!.id, {
    accessKey: parsed.data.accessKey,
    issuedAt: parsed.data.issuedAt,
    source: parsed.data.source,
    items: parsed.data.items,
  });
  res.status(201).json({ result });
});

nfeRouter.get('/notes', (req, res) => {
  res.json({ notes: listNotes(req.user!.id) });
});

nfeRouter.get('/notes/:id', (req, res) => {
  res.json({ note: getNote(req.user!.id, Number(req.params.id)) });
});

nfeRouter.get('/movements/:id/source', (req, res) => {
  res.json(getMovementSource(req.user!.id, Number(req.params.id)));
});
