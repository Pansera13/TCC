const axios = require('axios');
const xml2js = require('xml2js');

const TIMEOUT_MS = 10000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9',
};

async function httpGet(url, attempt = 1) {
  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT_MS,
      headers: HEADERS,
      maxRedirects: 5,
      responseType: 'text',
      validateStatus: () => true, // não lança erro para nenhum status HTTP
    });
    return { status: res.status, body: res.data };
  } catch (err) {
    if (attempt < MAX_RETRIES && (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.message === 'timeout')) {
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return httpGet(url, attempt + 1);
    }
    if (err.code === 'ETIMEDOUT' || err.message === 'timeout') throw new Error('timeout');
    throw err;
  }
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
  if (res.status === 302) {
    throw Object.assign(new Error('A consulta pública da SEFAZ exige captcha e não pode ser feita automaticamente. Para cadastrar, escaneie o código de barras do produto ou use o cadastro manual.'), { status: 502 });
  }
  if (res.status === 429 || res.body.toLowerCase().includes('muitas requisi')) {
    throw Object.assign(new Error('Muitas consultas em sequência. Aguarde alguns instantes e tente novamente.'), { status: 429 });
  }
  if (res.status === 503 || res.body.toLowerCase().includes('fora do ar') || res.body.toLowerCase().includes('indispon')) {
    throw Object.assign(new Error('O serviço da SEFAZ está temporariamente indisponível. Tente novamente em alguns minutos.'), { status: 503 });
  }
  if (res.status !== 200 || !res.body.trim().startsWith('<')) {
    throw Object.assign(new Error('A SEFAZ não liberou o XML desta nota (a consulta pública exige captcha). Para cadastrar, escaneie o código de barras do produto ou use o cadastro manual.'), { status: 502 });
  }

  const produtos = await parseNfeXml(res.body);
  if (!produtos.length) throw Object.assign(new Error('Nenhum produto encontrado na NF-e.'), { status: 422 });

  return produtos;
}

module.exports = { queryNfe };
