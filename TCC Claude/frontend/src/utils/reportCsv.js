// Monta o CSV do relatório: BOM UTF-8 + separador ';' para abrir certo no Excel pt-BR.
const SEP = ';';

function celula(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const linha = (cols) => cols.map(celula).join(SEP);
const dec = (n) => String(n).replace('.', ',');

export function buildReportCsv(r) {
  const out = [];
  out.push(linha(['Resumo']));
  out.push(linha(['Período', `${r.period.from} a ${r.period.to}`]));
  out.push(linha(['Total de produtos', r.summary.totalProdutos]));
  out.push(linha(['Estoque baixo', r.summary.estoqueBaixo]));
  out.push(linha(['Esgotados', r.summary.esgotados]));
  out.push(linha(['Total de entradas', dec(r.summary.totalEntradas)]));
  out.push(linha(['Total de saídas', dec(r.summary.totalSaidas)]));
  out.push('');
  out.push(linha(['Top 10 mais retirados']));
  out.push(linha(['Posição', 'Produto', 'Quantidade retirada']));
  r.topRetirados.forEach((t, i) => out.push(linha([i + 1, t.nome, dec(t.quantidade)])));
  out.push('');
  out.push(linha(['Consumo por categoria']));
  out.push(linha(['Categoria', 'Quantidade retirada']));
  r.consumoPorCategoria.forEach(c => out.push(linha([c.categoria, dec(c.quantidade)])));
  out.push('');
  out.push(linha(['Giro de estoque por produto (retirado no período / estoque atual)']));
  out.push(linha(['Produto', 'Categoria', 'Unidade', 'Estoque atual', 'Retirado', 'Giro']));
  r.giro.forEach(g => out.push(linha([g.nome, g.categoria, g.unidade, dec(g.estoque), dec(g.retirado), g.giro === null ? '—' : dec(g.giro.toFixed(1))])));
  return '﻿' + out.join('\r\n');
}

export function downloadReportCsv(r) {
  const blob = new Blob([buildReportCsv(r)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-${r.period.from}_a_${r.period.to}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
