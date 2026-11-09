"""Gera novos JWT_SECRET e JWT_RESET_SECRET e grava no .env, sem exibir os valores.

Uso (dentro de backend-django):
    python scripts/rotacionar_jwt.py              # usa ./.env
    python scripts/rotacionar_jwt.py caminho/.env

Depois reinicie o servidor: todos os tokens emitidos com os valores antigos
deixam de valer e as pessoas precisam entrar de novo.
"""
import hashlib
import os
import pathlib
import re
import secrets
import sys

CHAVES = ('JWT_SECRET', 'JWT_RESET_SECRET')
PADRAO = re.compile(r'^(\s*)(JWT_SECRET|JWT_RESET_SECRET)\s*=.*$')


def _hash(valor):
    return hashlib.sha256(valor.encode()).hexdigest()


def _valores(linhas):
    achados = {}
    for linha in linhas:
        m = PADRAO.match(linha)
        if m:
            achados[m.group(2)] = linha.split('=', 1)[1].strip().strip('"').strip("'")
    return achados


def main():
    base = pathlib.Path(__file__).resolve().parent.parent
    caminho = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else base / '.env'
    if not caminho.is_file():
        sys.exit(f'Arquivo não encontrado: {caminho}')

    bruto = caminho.read_bytes().decode('utf-8')
    eol = '\r\n' if '\r\n' in bruto else '\n'
    termina_com_eol = bruto.endswith(('\n', '\r\n'))
    linhas = bruto.splitlines()

    antigos = _valores(linhas)
    novos = {chave: secrets.token_urlsafe(64) for chave in CHAVES}
    escritos = set()
    saida = []
    for linha in linhas:
        m = PADRAO.match(linha)
        if m:
            saida.append(f'{m.group(1)}{m.group(2)}={novos[m.group(2)]}')
            escritos.add(m.group(2))
        else:
            saida.append(linha)
    for chave in CHAVES:  # variável ausente: acrescenta no fim
        if chave not in escritos:
            saida.append(f'{chave}={novos[chave]}')

    texto = eol.join(saida) + (eol if termina_com_eol else '')
    temporario = caminho.with_name(caminho.name + '.novo')
    temporario.write_bytes(texto.encode('utf-8'))

    # Conferência antes de trocar o arquivo: só as duas chaves podem ter mudado.
    reler = temporario.read_bytes().decode('utf-8').splitlines()
    outras_antes = [l for l in linhas if not PADRAO.match(l)]
    outras_depois = [l for l in reler if not PADRAO.match(l)]
    gravados = _valores(reler)
    if outras_antes != outras_depois or any(gravados.get(c) != novos[c] for c in CHAVES):
        temporario.unlink(missing_ok=True)
        sys.exit('Conferência falhou: o .env NÃO foi alterado.')

    os.replace(temporario, caminho)
    for chave in CHAVES:
        mudou = _hash(antigos.get(chave, '')) != _hash(novos[chave])
        print(f'{chave}: rotacionado ({"valor novo diferente do antigo" if mudou else "ATENÇÃO: igual ao antigo"})')
    print('Reinicie o servidor. Todas as sessões antigas foram invalidadas.')


if __name__ == '__main__':
    main()
