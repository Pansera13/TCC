// Limitador em memória (janela deslizante por chave). Zera ao reiniciar o servidor e não vale entre instâncias.
function criarLimite({ max, janelaMs }) {
  const acessos = new Map();

  function recentes(chave, agora) {
    const lista = (acessos.get(chave) || []).filter((t) => agora - t < janelaMs);
    if (lista.length) acessos.set(chave, lista); else acessos.delete(chave);
    return lista;
  }

  return {
    // Segundos até poder tentar de novo, ou 0 se ainda há folga
    restante(chave, agora = Date.now()) {
      const lista = recentes(chave, agora);
      return lista.length >= max ? Math.ceil((janelaMs - (agora - lista[0])) / 1000) : 0;
    },
    registrar(chave, agora = Date.now()) {
      const lista = recentes(chave, agora);
      lista.push(agora);
      acessos.set(chave, lista);
    },
    limpar(chave) { acessos.delete(chave); },
  };
}

function ipDe(req) {
  return req.ip || req.socket?.remoteAddress || 'desconhecido';
}

// Middleware: conta toda chamada por IP e responde 429 acima do limite
function limitePorIp(opcoes, mensagem = 'Muitas tentativas. Tente novamente mais tarde.') {
  const limite = criarLimite(opcoes);
  return (req, res, next) => {
    const chave = ipDe(req);
    const espera = limite.restante(chave);
    if (espera > 0) {
      res.set('Retry-After', String(espera));
      return res.status(429).json({ message: mensagem, retry_after: espera });
    }
    limite.registrar(chave);
    next();
  };
}

module.exports = { criarLimite, limitePorIp, ipDe };
