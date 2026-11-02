// Cópia da validação do backend (backend/src/utils/emailRecuperacao.js) só para resposta imediata na tela;
// a validação do backend prevalece.
export const PROVEDORES = [
  'gmail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com',
  'yahoo.com', 'yahoo.com.br', 'icloud.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'proton.me',
];

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizarEmail = (email) => String(email ?? '').replace(/\s+/g, '').toLowerCase();

function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

function sugerirDominio(dominio) {
  let melhor = null;
  let menor = 3;
  for (const p of PROVEDORES) {
    const dist = distancia(dominio, p);
    if (dist < menor) { menor = dist; melhor = p; }
  }
  return melhor;
}

// Devolve { message, sugestao } quando há problema, ou null se o e-mail é aceito
export function problemaEmailRecuperacao(email, emailLogin) {
  const valor = normalizarEmail(email);
  if (!valor || !FORMATO.test(valor)) return { message: 'Informe um e-mail de recuperação válido.' };
  if (valor === normalizarEmail(emailLogin)) {
    return { message: 'O e-mail de recuperação deve ser diferente do e-mail de login.' };
  }
  const dominio = valor.split('@')[1];
  if (!PROVEDORES.includes(dominio)) {
    return {
      message: `Provedor de e-mail não aceito. Use um destes: ${PROVEDORES.join(', ')}.`,
      sugestao: sugerirDominio(dominio) || undefined,
    };
  }
  return null;
}

export function aplicarSugestao(email, sugestao) {
  return `${normalizarEmail(email).split('@')[0]}@${sugestao}`;
}
