// Regras do e-mail de recuperação: formato, provedor permitido, diferente do login e sugestão para erro de digitação.
const PROVEDORES = [
  'gmail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com',
  'yahoo.com', 'yahoo.com.br', 'icloud.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'proton.me',
];

const FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizar(email) {
  return String(email ?? '').replace(/\s+/g, '').toLowerCase();
}

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

// Provedor mais próximo (distância <= 2); empate resolve pelo primeiro da lista
function sugerirDominio(dominio) {
  let melhor = null;
  let menor = 3;
  for (const p of PROVEDORES) {
    const dist = distancia(dominio, p);
    if (dist < menor) { menor = dist; melhor = p; }
  }
  return melhor;
}

// Devolve { ok: true, email } ou { ok: false, message, sugestao? }
function validarEmailRecuperacao(email, emailLogin) {
  const valor = normalizar(email);
  if (!valor || !FORMATO.test(valor)) return { ok: false, message: 'Informe um e-mail de recuperação válido.' };
  if (valor === normalizar(emailLogin)) {
    return { ok: false, message: 'O e-mail de recuperação deve ser diferente do e-mail de login.' };
  }
  const dominio = valor.split('@')[1];
  if (!PROVEDORES.includes(dominio)) {
    const sugestao = sugerirDominio(dominio);
    return {
      ok: false,
      message: `Provedor de e-mail não aceito. Use um destes: ${PROVEDORES.join(', ')}.`,
      ...(sugestao && { sugestao }),
    };
  }
  return { ok: true, email: valor };
}

module.exports = { PROVEDORES, normalizar, sugerirDominio, validarEmailRecuperacao };
