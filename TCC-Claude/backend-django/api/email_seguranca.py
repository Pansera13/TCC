"""
E-mails de segurança do StockFlow — avisos sobre alterações críticas na conta.

Usa o Resend (mesma integração de api/views/recuperacao.py).
Nunca levanta exceção ao chamador — falha no envio não bloqueia a operação.
"""

import logging
import os

import requests

logger = logging.getLogger('api.email_seguranca')


def _enviar(para: str, assunto: str, texto: str) -> None:
    """Envia e-mail via Resend. Levanta RuntimeError se falhar."""
    api_key = os.environ.get('RESEND_API_KEY', '')
    email_from = os.environ.get('EMAIL_FROM', 'StockFlow <onboarding@resend.dev>')
    if not api_key:
        raise ValueError('RESEND_API_KEY não configurada')
    r = requests.post(
        'https://api.resend.com/emails',
        headers={'Authorization': f'Bearer {api_key}', 'Content-Type': 'application/json'},
        json={'from': email_from, 'to': [para], 'subject': assunto, 'text': texto},
        timeout=10,
    )
    if r.status_code not in (200, 201):
        raise RuntimeError(f'Resend retornou HTTP {r.status_code}')


def aviso_senha_alterada(email_para: str) -> None:
    """
    Envia aviso de que a senha da conta foi alterada.
    Sem link nem token. Falha é registrada em log mas não propagada.
    """
    try:
        _enviar(
            para=email_para,
            assunto='Sua senha no StockFlow foi alterada',
            texto=(
                'Olá,\n\n'
                'A senha da sua conta no StockFlow foi alterada agora.\n\n'
                'Se não foi você, entre em contato conosco imediatamente '
                'para proteger sua conta.\n\n'
                '— Equipe StockFlow'
            ),
        )
    except Exception:
        logger.warning('Falha ao enviar aviso de senha alterada para %s', email_para[:3] + '***')
