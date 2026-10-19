import { useLayoutEffect, useState } from 'react';

const ALTURA_LINHA_PADRAO = 33;

// Calcula quantas linhas cabem na área da tabela, para não precisar de rolagem vertical.
// Devolve [refCallback, linhas]: ligue o refCallback ao elemento que ocupa o espaço da tabela
// (a altura dele deve vir do layout, ex.: flex-1 min-h-0 overflow-y-hidden).
// Cabeçalho e linhas são medidos no DOM (usa a linha mais alta); antes da primeira medição usa `inicial`.
// Se mesmo assim o conteúdo passar da área (ex.: linha que quebrou em duas), tira uma linha por vez.
export function useFitRows(inicial = 10, minimo = 3) {
  const [el, setEl] = useState(null);
  const [linhas, setLinhas] = useState(inicial);

  useLayoutEffect(() => {
    if (!el) return undefined;
    const calcular = () => {
      const cabecalho = el.querySelector('thead')?.offsetHeight ?? 0;
      const alturas = [...el.querySelectorAll('tbody tr')].map(tr => tr.offsetHeight);
      const linha = alturas.length ? Math.max(...alturas) : ALTURA_LINHA_PADRAO;
      setLinhas(Math.max(minimo, Math.floor((el.clientHeight - cabecalho) / linha)));
    };
    calcular();
    const ro = new ResizeObserver(calcular);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, minimo]);

  // Ajuste fino a cada renderização: se estourou a área, reduz até caber
  useLayoutEffect(() => {
    if (el && el.scrollHeight > el.clientHeight + 1) setLinhas(l => Math.max(minimo, l - 1));
  });

  return [setEl, linhas];
}
