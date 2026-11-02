const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

function valor(linha, key) {
  const v = linha[key];
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return Number(v);
  return v;
}

function comparar(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

// Ordena sem alterar o array original. `ordem` = { key, dir: 'asc' | 'desc' } ou null (mantém a ordem original).
// Texto em ordem alfabética (pt-BR, sem diferenciar maiúsculas/acentos e com números naturais),
// números do menor para o maior, datas ISO cronologicamente. Valores vazios ficam sempre no fim.
export function sortRows(linhas, ordem) {
  if (!ordem?.key) return linhas;
  const sinal = ordem.dir === 'desc' ? -1 : 1;
  const numericos = ['quantidade', 'peso_kg'].includes(ordem.key);
  return [...linhas].sort((x, y) => {
    let a = valor(x, ordem.key);
    let b = valor(y, ordem.key);
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (numericos) { a = Number(a); b = Number(b); }
    return sinal * comparar(a, b);
  });
}

// Alterna a ordem de uma coluna: primeiro clique crescente, segundo decrescente, terceiro remove a ordenação.
export function proximaOrdem(atual, key) {
  if (atual?.key !== key) return { key, dir: 'asc' };
  if (atual.dir === 'asc') return { key, dir: 'desc' };
  return null;
}
