"""Regras de validação do e-mail de recuperação — espelho de emailRecuperacao.js"""
import re

PROVEDORES = [
    'gmail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com',
    'yahoo.com', 'yahoo.com.br', 'icloud.com', 'uol.com.br', 'bol.com.br', 'terra.com.br', 'proton.me',
]

FORMATO = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


def normalizar(email):
    return re.sub(r'\s+', '', str(email or '')).lower()


def _distancia(a, b):
    d = [[i] + [0] * len(b) for i in range(len(a) + 1)]
    for j in range(len(b) + 1):
        d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(
                d[i - 1][j] + 1,
                d[i][j - 1] + 1,
                d[i - 1][j - 1] + (0 if a[i - 1] == b[j - 1] else 1),
            )
    return d[len(a)][len(b)]


def sugerir_dominio(dominio):
    melhor, menor = None, 3
    for p in PROVEDORES:
        dist = _distancia(dominio, p)
        if dist < menor:
            menor, melhor = dist, p
    return melhor


def validar_email_recuperacao(email, email_login):
    valor = normalizar(email)
    if not valor or not FORMATO.match(valor):
        return {'ok': False, 'message': 'Informe um e-mail de recuperação válido.'}
    if valor == normalizar(email_login):
        return {'ok': False, 'message': 'O e-mail de recuperação deve ser diferente do e-mail de login.'}
    dominio = valor.split('@')[1]
    if dominio not in PROVEDORES:
        sugestao = sugerir_dominio(dominio)
        result = {
            'ok': False,
            'message': f'Provedor de e-mail não aceito. Use um destes: {", ".join(PROVEDORES)}.',
        }
        if sugestao:
            result['sugestao'] = sugestao
        return result
    return {'ok': True, 'email': valor}
