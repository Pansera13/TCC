import { parse as parseHtml } from 'node-html-parser';
import { serviceUnavailable } from '../errors.js';
import { assertValidAccessKey, ufFromAccessKey } from './accessKey.js';
import { parseBrNumber, type NfeItem, type NotaFiscalProvider, type ParsedNote } from './provider.js';

/**
 * Parse the public SEFAZ NFC-e consultation HTML ("consultaNFCe") into items.
 * The common layout uses <table id="tabResult"> with one row per item; each row
 * carries the description (.txtTit), quantity (.Rqtd), unit (.RUN) and unit
 * value (.RvlUnit). GTIN is usually absent on this page, so matching falls back
 * to description downstream (see design.md).
 */
export function parseSefazHtml(html: string, accessKey: string): ParsedNote {
  const root = parseHtml(html);
  const rows = root.querySelectorAll('#tabResult tr');
  const items: NfeItem[] = [];
  for (const row of rows) {
    const description = row.querySelector('.txtTit')?.text?.trim();
    if (!description) continue;
    const qtyText = row.querySelector('.Rqtd')?.text?.replace(/.*:/, '');
    const unitText = row.querySelector('.RUN')?.text?.replace(/.*:/, '');
    const valText = row.querySelector('.RvlUnit')?.text?.replace(/.*:/, '');
    items.push({
      description,
      gtin: null,
      quantity: parseBrNumber(qtyText) ?? 0,
      unit: (unitText?.trim() || 'UN').toUpperCase(),
      unitValue: parseBrNumber(valText),
    });
  }
  return { accessKey, issuedAt: null, items };
}

type HtmlFetcher = (accessKey: string, uf: string) => Promise<string>;

// Public consultation endpoints differ per state; only the MVP target(s) are
// wired here. Extend this map to support more states (see tasks 5.3).
const CONSULTA_URL_BY_UF: Record<string, string> = {
  // RS (43) — example target for the MVP.
  '43': 'https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=',
};

const defaultFetcher: HtmlFetcher = async (accessKey, uf) => {
  const base = CONSULTA_URL_BY_UF[uf];
  if (!base) {
    throw serviceUnavailable('uf_not_supported', `UF ${uf} ainda nao suportada para consulta automatica.`);
  }
  const res = await fetch(`${base}${accessKey}`, { redirect: 'follow' });
  if (!res.ok) {
    throw serviceUnavailable('sefaz_unavailable', 'Portal da SEFAZ indisponivel no momento.');
  }
  return res.text();
};

/**
 * Fetches and parses the public SEFAZ consultation page. The HTTP fetch is
 * injectable so tests can run against a saved fixture without network access.
 */
export class SefazHtmlProvider implements NotaFiscalProvider {
  constructor(private readonly fetcher: HtmlFetcher = defaultFetcher) {}

  async fetchByAccessKey(accessKey: string): Promise<ParsedNote> {
    assertValidAccessKey(accessKey);
    const uf = ufFromAccessKey(accessKey);
    let html: string;
    try {
      html = await this.fetcher(accessKey, uf);
    } catch (err: any) {
      if (err?.status) throw err;
      throw serviceUnavailable('sefaz_unavailable', 'Nao foi possivel consultar a SEFAZ.');
    }
    const note = parseSefazHtml(html, accessKey);
    if (note.items.length === 0) {
      throw serviceUnavailable('sefaz_empty', 'A consulta nao retornou itens (dados indisponiveis ou incompletos).');
    }
    return note;
  }
}
