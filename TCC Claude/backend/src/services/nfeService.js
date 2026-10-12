const https = require('https');
const http = require('http');
const xml2js = require('xml2js');

const TIMEOUT_MS = 10000;

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: TIMEOUT_MS }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

// Extract 44-digit access key from raw scan value (plain key or URL)
function extractChave(raw) {
  const match = raw.match(/\d{44}/);
  return match ? match[0] : null;
}

// Parse NF-e XML (modelo 55 or NFC-e modelo 65) and return product list
async function parseNfeXml(xml) {
  const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false, ignoreAttrs: true });

  // Try nfeProc > NFe > infNFe > det
  const root =
    parsed?.nfeProc?.NFe?.infNFe ??
    parsed?.NFe?.infNFe ??
    parsed?.nfceProc?.NFe?.infNFe ??
    null;

  if (!root) throw new Error('Formato de NF-e não reconhecido.');

  const dets = Array.isArray(root.det) ? root.det : [root.det];

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

async function queryNfe(chaveOrUrl) {
  const chave = extractChave(chaveOrUrl);
  if (!chave) throw Object.assign(new Error('Chave de acesso inválida (deve ter 44 dígitos).'), { status: 400 });

  // SEFAZ public NF-e query endpoint (ambiente nacional)
  const url = `https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=completa&tipoConteudo=XmlNFe&nChave=${chave}`;

  let res;
  try {
    res = await httpGet(url);
  } catch (err) {
    if (err.message === 'timeout') throw Object.assign(new Error('Tempo esgotado ao consultar a SEFAZ. Tente novamente.'), { status: 504 });
    throw Object.assign(new Error('Falha de rede ao consultar a SEFAZ.'), { status: 502 });
  }

  if (res.status === 404 || res.body.includes('NF-e não encontrada')) {
    throw Object.assign(new Error('NF-e não encontrada para a chave informada.'), { status: 404 });
  }
  if (res.status !== 200) {
    throw Object.assign(new Error(`SEFAZ retornou erro ${res.status}.`), { status: 502 });
  }

  const produtos = await parseNfeXml(res.body);
  if (!produtos.length) throw Object.assign(new Error('Nenhum produto encontrado na NF-e.'), { status: 422 });

  return produtos;
}

module.exports = { queryNfe };
