export interface NfeItem {
  description: string;
  gtin: string | null;
  quantity: number;
  unit: string;
  unitValue: number | null;
}

export interface ParsedNote {
  accessKey: string;
  issuedAt: string | null;
  items: NfeItem[];
}

/**
 * A source of NF-e/NFC-e data. Implementations resolve an access key to the
 * note's items. Keeping this behind an interface lets us swap the automatic
 * SEFAZ source, an XML upload, or a fake without touching the import flow
 * (see design.md - "Obtencao dos dados da NFC-e").
 */
export interface NotaFiscalProvider {
  fetchByAccessKey(accessKey: string): Promise<ParsedNote>;
}

/** Deterministic provider for tests and demos. */
export class FakeProvider implements NotaFiscalProvider {
  constructor(private readonly notes: Record<string, ParsedNote>) {}
  async fetchByAccessKey(accessKey: string): Promise<ParsedNote> {
    const note = this.notes[accessKey];
    if (!note) {
      const { notFound } = await import('../errors.js');
      throw notFound('note_not_found', 'Nota nao encontrada na fonte.');
    }
    return note;
  }
}

/** Parse a Brazilian-formatted number ("1.234,56" or "3,50") to a float. */
export function parseBrNumber(text: string | undefined | null): number | null {
  if (text == null) return null;
  const cleaned = text.replace(/[^\d,.-]/g, '').trim();
  if (!cleaned) return null;
  const normalized = cleaned.replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
