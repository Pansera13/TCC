"""
Rate limiting centralizado para os endpoints de autenticação do StockFlow.

Usa apenas django.core.cache (sem dependências externas). Implementa janela fixa:
o contador é criado com cache.add (TTL definido uma única vez) e incrementado com
cache.incr (sem reiniciar o TTL). O bloqueio armazena o timestamp de expiração para
calcular retry_after real, independentemente do cache.ttl (inexistente no LocMemCache).

TRUSTED_PROXY_COUNT: número de proxies reversos confiáveis na frente do servidor.
0 = usa REMOTE_ADDR (padrão seguro); N = pega o N-ésimo IP da direita do X-Forwarded-For.
AVISO: sem proxies configurados (N=0), confiar em X-Forwarded-For permite que qualquer
cliente forje o IP e burle o rate limit.
"""

import hashlib
import logging
import os
import time

from django.core.cache import cache

logger = logging.getLogger('api.limites')

# Hash dummy pré-computado para equalizar tempo de resposta quando o identificador
# não existe (evita enumeração de contas por diferença de tempo de resposta).
# Calculado em rounds=4 para não impactar o startup; o custo real é no bcrypt do login.
import bcrypt as _bcrypt
_DUMMY_HASH = _bcrypt.hashpw(b'dummy-stockflow-timing', _bcrypt.gensalt(rounds=4)).decode()


def ip_do_cliente(request):
    """
    Retorna o IP do cliente a partir de REMOTE_ADDR ou X-Forwarded-For.

    Controlado por TRUSTED_PROXY_COUNT (env, padrão 0):
    - 0: usa REMOTE_ADDR; ignora X-Forwarded-For (qualquer cliente poderia forjá-lo).
    - N > 0: pega o N-ésimo IP contando da direita no X-Forwarded-For,
      assumindo que N proxies reversos confiáveis estão na frente do servidor.

    Exemplos:
      1 proxy  → XFF "client"           → N=1 → ips[-1]="client" ✓
      2 proxies → XFF "client, proxy1"  → N=2 → ips[-2]="client" ✓

    Fallback: se XFF tiver menos entradas que N, usa ips[0] (mais antigo disponível).
    """
    try:
        count = int(os.environ.get('TRUSTED_PROXY_COUNT', '0'))
    except ValueError:
        count = 0

    if count <= 0:
        return request.META.get('REMOTE_ADDR', 'unknown')

    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if not forwarded:
        return request.META.get('REMOTE_ADDR', 'unknown')

    ips = [ip.strip() for ip in forwarded.split(',')]
    idx = -count if len(ips) >= count else 0
    return ips[idx] or request.META.get('REMOTE_ADDR', 'unknown')


def _chave_bloq(chave):
    return f'{chave}:bloq'


def segundos_bloqueado(chave):
    """
    Retorna 0 se a chave não está bloqueada, ou os segundos inteiros restantes
    calculados a partir do timestamp de expiração armazenado no cache.
    """
    expira_em = cache.get(_chave_bloq(chave))
    if expira_em is None:
        return 0
    restante = int(expira_em - time.time())
    return max(restante, 0)


def registrar_falha(chave, janela_s, max_falhas, bloqueio_s, contexto=''):
    """
    Registra uma falha para a chave. Usa janela fixa: cache.add cria o contador
    com TTL fixo; cache.incr incrementa sem reiniciar o TTL.

    Quando max_falhas é atingido, grava a chave de bloqueio com o timestamp de
    expiração e loga um WARNING com o contexto mascarado.

    contexto: string opcional para o log (ex.: 'login', 'register') — não é a senha.
    """
    try:
        adicionado = cache.add(chave, 1, timeout=janela_s)
        if not adicionado:
            try:
                total = cache.incr(chave)
            except ValueError:
                # Chave expirou entre o add e o incr: reinicia a janela
                cache.add(chave, 1, timeout=janela_s)
                total = 1
        else:
            total = 1
    except Exception:
        return

    if total >= max_falhas and not cache.get(_chave_bloq(chave)):
        expira_em = time.time() + bloqueio_s
        cache.set(_chave_bloq(chave), expira_em, timeout=bloqueio_s + 10)
        chave_mascarada = (str(chave)[:2] + '***') if len(str(chave)) > 2 else '***'
        logger.warning('Rate limit atingido: chave=%s contexto=%s', chave_mascarada, contexto or '?')


def limpar_contador(chave):
    """Remove o contador e o bloqueio da chave (usado após login bem-sucedido)."""
    cache.delete(chave)
    cache.delete(_chave_bloq(chave))


def chave_id(identificador):
    """Deriva a chave de cache para um identificador normalizado (sha256 truncado)."""
    normalizado = str(identificador or '').lower().replace(' ', '')
    digest = hashlib.sha256(normalizado.encode()).hexdigest()[:16]
    return f'login:id:{digest}'
