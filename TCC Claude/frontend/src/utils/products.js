// Máximo de produtos exibidos por categoria em cada página (todos os layouts da aba Produtos).
export const PRODUCTS_PAGE_SIZE = 15;

// Linhas por página nas demais tabelas (Início, Sem estoque, Equipe, Relatórios).
export const TABLE_PAGE_SIZE = 12;

const SEM_CATEGORIA = 'Sem Categoria';

// Filtra por nome e agrupa por categoria. "Sem Categoria" fica por último.
export function groupProductsByCategory(products, search = '') {
  const term = search.toLowerCase().trim();
  const grouped = {};
  for (const p of products) {
    if (!p.nome.toLowerCase().includes(term)) continue;
    const cat = p.categoria || SEM_CATEGORIA;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p);
  }
  const categorias = Object.keys(grouped).sort((a, b) =>
    a === SEM_CATEGORIA ? 1 : b === SEM_CATEGORIA ? -1 : a.localeCompare(b)
  );
  return { grouped, categorias };
}

// Recorta uma página; a página pedida é limitada ao intervalo válido [1, totalPages].
export function paginate(items, page = 1, size = PRODUCTS_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (current - 1) * size;
  return { items: items.slice(start, start + size), page: current, totalPages };
}
