"""
Registro de eventos de segurança para o StockFlow.

Grava na tabela `eventos_seguranca` (criada via SQL aprovado pelo operador).
Nunca levanta exceção — falha no log não derruba a requisição.
Nunca grava senha, código ou token nos detalhes.
E-mails nos detalhes são sempre mascarados.

Tipos definidos:
  login_falho           — tentativa de login com credenciais inválidas
  login_bloqueado       — login/recuperação bloqueado por rate limit (429)
  recuperacao_solicitada — código de recuperação de senha enviado por e-mail
  recuperacao_concluida — senha redefinida com sucesso via código
  codigo_errado         — código de recuperação digitado incorretamente
  codigo_bloqueado      — limite de tentativas do código esgotado
  cadastro              — nova conta criada com sucesso
"""

import json
import logging

from django.db import connection, transaction
from api.limites import ip_do_cliente

logger = logging.getLogger('api.eventos')

UA_MAX = 300  # caracteres máximos do User-Agent armazenado


def _mascarar_email(email: str) -> str:
    if not email or '@' not in email:
        return '***'
    local, domain = email.split('@', 1)
    return f'{local[:1]}***@{domain}'


def _ua(request) -> str | None:
    ua = request.META.get('HTTP_USER_AGENT', '') if request else ''
    return (ua[:UA_MAX] or None) if ua else None


def _inserir(tipo, tenant_id, usuario_id, ip, ua, detalhes_json):
    """Faz o INSERT em eventos_seguranca dentro de um savepoint."""
    with transaction.atomic():
        with connection.cursor() as cur:
            cur.execute(
                """
                INSERT INTO eventos_seguranca
                    (tenant_id, usuario_id, tipo, ip, user_agent, detalhes)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                """,
                [tenant_id, usuario_id, tipo, ip, ua, detalhes_json],
            )


def registrar(
    tipo: str,
    request=None,
    tenant_id=None,
    usuario_id=None,
    detalhes: dict | None = None,
):
    """
    Insere uma linha em eventos_seguranca.
    Silencia todas as exceções para nunca derrubar a requisição.
    """
    try:
        ip = ip_do_cliente(request) if request is not None else None
        ua = _ua(request) if request is not None else None
        detalhes_json = json.dumps(detalhes) if detalhes else None
        _inserir(tipo, tenant_id, usuario_id, ip, ua, detalhes_json)
    except Exception:
        logger.debug('Falha ao registrar evento tipo=%s', tipo, exc_info=True)
