# Matriz de permissões — espelho exato de backend/src/utils/permissoes.js
# Hierarquia: Funcionário (user=1) < Sócio (socio=2) < Administrador (admin=3)

NIVEIS = {'user': 1, 'socio': 2, 'admin': 3}

PERMISSOES = {
    'estoque:ver': NIVEIS['user'],
    'produto:retirar': NIVEIS['user'],
    'produto:entrada': NIVEIS['user'],
    'movimentacao:ver-proprias': NIVEIS['user'],

    'produto:cadastrar': NIVEIS['socio'],
    'produto:editar': NIVEIS['socio'],
    'produto:arquivar': NIVEIS['socio'],
    'produto:importar-nfe': NIVEIS['socio'],
    'relatorio:ver': NIVEIS['socio'],
    'movimentacao:ver-todas': NIVEIS['socio'],
    'produto:restaurar': NIVEIS['admin'],
    'produto:excluir': NIVEIS['admin'],
    'produto:ver-arquivados': NIVEIS['admin'],
}


def nivel(cargo):
    return NIVEIS.get(cargo, 0)


def cargo_valido(cargo):
    return cargo in NIVEIS


def can(cargo, permissao):
    minimo = PERMISSOES.get(permissao)
    return minimo is not None and nivel(cargo) >= minimo


def permissoes_do_cargo(cargo):
    return [p for p in PERMISSOES if can(cargo, p)]


