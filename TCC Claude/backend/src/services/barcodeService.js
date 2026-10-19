'use strict';

const axios = require('axios');

const TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// Cache em memória: codigo → { data: {...} | null, ts: number }
const cache = new Map();

function getCache(codigo) {
  const entry = cache.get(codigo);
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(codigo);
    return undefined;
  }
  return entry.data;
}

function setCache(codigo, data) {
  cache.set(codigo, { data, ts: Date.now() });
}

// Retorna { result, tempFail }
// tempFail=true significa falha temporária (limite, rede, 5xx) — não cachear ausência
// tempFail=false significa resposta definitiva (encontrado ou não encontrado mesmo)
async function queryCosmos(codigo) {
  const token = process.env.COSMOS_TOKEN;
  if (!token) return { result: null, tempFail: false };

  try {
    const { data, status } = await axios.get(
      `https://api.cosmos.bluesoft.com.br/gtins/${codigo}.json`,
      {
        headers: {
          'X-Cosmos-Token': token,
          'Content-Type': 'application/json',
          'User-Agent': 'StockFlow/1.0',
        },
        timeout: TIMEOUT_MS,
        validateStatus: () => true,
      }
    );

    if (status === 429 || status === 401 || status === 403) {
      console.warn(`[barcodeService] Cosmos: HTTP ${status} — tentando Open Food Facts`);
      return { result: null, tempFail: true };
    }
    if (status >= 500) {
      console.warn(`[barcodeService] Cosmos: HTTP ${status} (servidor) — tentando Open Food Facts`);
      return { result: null, tempFail: true };
    }
    if (status === 404 || status === 204 || !data) {
      return { result: null, tempFail: false };
    }
    if (status !== 200) {
      console.warn(`[barcodeService] Cosmos: HTTP ${status} inesperado — tentando Open Food Facts`);
      return { result: null, tempFail: true };
    }

    return {
      tempFail: false,
      result: {
        codigo,
        nome: data.description || null,
        marca: data.brand?.name || null,
        categoria: data.gtins_by_ncm?.[0]?.ncm?.description || null,
        ncm: data.gtins_by_ncm?.[0]?.ncm?.code || null,
        imagem: data.thumbnail || data.picture || null,
        fonte: 'cosmos',
      },
    };
  } catch (err) {
    console.warn(`[barcodeService] Cosmos: ${err.code || err.message} — tentando Open Food Facts`);
    return { result: null, tempFail: true };
  }
}

// Retorna { result, tempFail }
async function queryOpenFoodFacts(codigo) {
  try {
    const { data, status } = await axios.get(
      `https://world.openfoodfacts.org/api/v2/product/${codigo}.json`,
      {
        params: { fields: 'product_name,product_name_pt,brands,categories_tags,image_front_url' },
        timeout: TIMEOUT_MS,
        validateStatus: () => true,
      }
    );

    if (status === 429) {
      console.warn('[barcodeService] Open Food Facts: HTTP 429');
      return { result: null, tempFail: true };
    }
    if (status >= 500) {
      console.warn(`[barcodeService] Open Food Facts: HTTP ${status}`);
      return { result: null, tempFail: true };
    }
    if (status === 404 || !data) return { result: null, tempFail: false };
    if (data.status === 0 || data.status === 'failure') return { result: null, tempFail: false };

    const p = data.product;
    if (!p) return { result: null, tempFail: false };

    const nome = (p.product_name_pt || p.product_name || '').trim();
    if (!nome) return { result: null, tempFail: false };

    const catTag =
      p.categories_tags?.find(t => t.startsWith('pt:')) ||
      p.categories_tags?.[0] ||
      null;
    const categoria = catTag
      ? catTag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ')
      : null;

    return {
      tempFail: false,
      result: {
        codigo,
        nome,
        marca: p.brands ? p.brands.split(',')[0].trim() : null,
        categoria,
        ncm: null,
        imagem: p.image_front_url || null,
        fonte: 'openfoodfacts',
      },
    };
  } catch (err) {
    console.warn(`[barcodeService] Open Food Facts: ${err.code || err.message}`);
    return { result: null, tempFail: true };
  }
}

async function lookupBarcode(codigo) {
  const cached = getCache(codigo);
  if (cached !== undefined) return cached;

  const cosmos = await queryCosmos(codigo);

  // Só consulta o OFF se a Cosmos não encontrou (por qualquer motivo)
  const off = cosmos.result ? { result: null, tempFail: false } : await queryOpenFoodFacts(codigo);

  const result = cosmos.result || off.result;

  if (result) {
    setCache(codigo, result);
    return result;
  }

  // Produto não encontrado — decidir se cacheia e se lança erro
  const allTempFailed = cosmos.tempFail && off.tempFail;
  const anyTempFailed = cosmos.tempFail || off.tempFail;

  if (allTempFailed) {
    // Todas as fontes falharam temporariamente — avisa o usuário
    const err = new Error('Serviço de busca temporariamente indisponível. Tente novamente em alguns instantes.');
    err.status = 429;
    throw err;
  }

  if (!anyTempFailed) {
    // Ambas as fontes responderam de forma definitiva: produto realmente não existe
    setCache(codigo, null);
  }
  // Se só uma falhou temporariamente e a outra disse "não encontrado",
  // não cacheia — próxima tentativa pode tentar a fonte que falhou

  return null;
}

module.exports = { lookupBarcode };
