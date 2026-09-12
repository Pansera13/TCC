import { XMLParser } from 'fast-xml-parser';
import { badRequest } from '../errors.js';
import { extractAccessKey } from './accessKey.js';
import type { NfeItem, ParsedNote } from './provider.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Parse a NF-e/NFC-e XML document into a note. Reuses the same NfeItem shape as
 * every other provider so downstream review/import logic is source-agnostic.
 */
export function parseNfeXml(xml: string): ParsedNote {
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    throw badRequest('invalid_xml', 'XML invalido.');
  }
  const infNFe = doc?.nfeProc?.NFe?.infNFe ?? doc?.NFe?.infNFe;
  if (!infNFe) throw badRequest('invalid_xml', 'XML nao parece ser uma NF-e/NFC-e.');

  const rawId: string = infNFe['@_Id'] ?? '';
  const accessKey = extractAccessKey(rawId);
  if (!accessKey) throw badRequest('invalid_xml', 'Chave de acesso ausente no XML.');

  const issuedAt: string | null = infNFe?.ide?.dhEmi ?? infNFe?.ide?.dEmi ?? null;

  const items: NfeItem[] = asArray(infNFe.det).map((det: any) => {
    const prod = det?.prod ?? {};
    const gtinRaw = String(prod.cEAN ?? '').trim();
    const gtin = gtinRaw && gtinRaw.toUpperCase() !== 'SEM GTIN' ? gtinRaw : null;
    return {
      description: String(prod.xProd ?? '').trim(),
      gtin,
      quantity: Number(prod.qCom ?? 0),
      unit: String(prod.uCom ?? 'UN').trim().toUpperCase(),
      unitValue: prod.vUnCom != null ? Number(prod.vUnCom) : null,
    };
  });

  return { accessKey, issuedAt, items };
}
