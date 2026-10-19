const xml2js = require('xml2js');

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}

// Parse NF-e XML (modelo 55 or NFC-e modelo 65) and return product list
async function parseNfeXml(xml) {
  let parsed;
  try {
    // stripPrefix: aceita XML com prefixo de namespace (ex.: <ns:NFe>); sem prefixo o xmlns é só atributo e é ignorado
    parsed = await xml2js.parseStringPromise(xml, {
      explicitArray: false,
      ignoreAttrs: true,
      tagNameProcessors: [xml2js.processors.stripPrefix],
    });
  } catch {
    throw httpError('O arquivo não é um XML válido.', 400);
  }

  // Try nfeProc > NFe > infNFe > det
  const root =
    parsed?.nfeProc?.NFe?.infNFe ??
    parsed?.NFe?.infNFe ??
    parsed?.nfceProc?.NFe?.infNFe ??
    null;

  if (!root) throw httpError('Formato de NF-e não reconhecido.', 422);

  // Com um único <det> o xml2js devolve objeto em vez de array
  const dets = (Array.isArray(root.det) ? root.det : [root.det]).filter(d => d?.prod);

  return dets.map(det => {
    const prod = det.prod;
    return {
      nome: prod.xProd ?? 'Produto sem nome',
      quantidade: parseFloat(prod.qCom ?? prod.qTrib ?? '0'),
      unidade: String(prod.uCom ?? prod.uTrib ?? 'UN').trim(),
      peso_kg: prod.pesoL ? parseFloat(prod.pesoL) : null,
    };
  }).filter(p => p.quantidade > 0);
}

module.exports = { parseNfeXml };
