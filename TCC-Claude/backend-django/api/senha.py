"""
Validação de força de senha para o StockFlow.

Regras (todas verificadas no backend):
  - Mínimo SENHA_MIN caracteres
  - Não pode ser uma senha comum (lista interna)
  - Não pode ser parecida com o e-mail ou o nome do usuário

Uso:
    from api.senha import validar_senha
    erro = validar_senha(senha, email=email, nome=nome)
    if erro:
        return JsonResponse({'message': erro, 'field': 'senha'}, status=400)
"""

SENHA_MIN = 8

# ~300 senhas mais comuns; suficiente para o contexto de TCC.
# Fonte: derivado das listas SecLists/10-million-password-list-top-* e HaveIBeenPwned.
_SENHAS_COMUNS: frozenset = frozenset({
    '12345678', '123456789', '1234567890', '12345678910', '123456789010',
    'password', 'password1', 'password12', 'password123', 'password1234',
    'qwerty123', 'qwerty1234', 'qwertyuiop', 'qwerty', '1qaz2wsx',
    'iloveyou', 'iloveyou1', 'sunshine', 'princess', 'dragon',
    'letmein', 'letmein1', 'welcome', 'welcome1', 'monkey', 'monkey1',
    'master', 'master1', 'batman', 'superman', 'michael',
    'football', 'baseball', 'soccer', 'hockey', 'harley',
    '111111111', '1111111111', '0000000000', '99999999', '88888888',
    '11111111', '22222222', '33333333', '44444444', '55555555',
    '66666666', '77777777', '12341234', '11223344', '10203040',
    'abc12345', 'abc123456', 'abcdefgh', 'abcd1234', 'abcdef12',
    'starwars', 'shadow', 'shadow1', 'jessica', 'jessica1', 'jordan',
    'hunter', 'hunter1', 'hunter2', 'buster', 'buster1', 'ranger',
    'maggie', 'messi', 'ronaldo', 'ferrari', 'aaaaaa11', 'aaaaaaaa',
    'passw0rd', 'p@ssword', 'p@ss1234', 'pa$$word', 'p4ssword',
    'qazwsx', 'qazwsxedc', '1q2w3e4r', '1q2w3e4r5t', 'zxcvbnm',
    'zaq1xsw2', '0987654321', '987654321', '00000000', '12121212',
    '123123123', '1234512345', '321321321', '123654789', '147258369',
    '1597536842', '2580', '258025802580',
    'senha123', 'senha1234', 'senha12345', 'minha_senha', 'minhasenha',
    'admin123', 'admin1234', 'admin12345', 'admin@123', 'administrator',
    'root1234', 'toor1234', 'test1234', 'test123456', 'guest1234',
    'user1234', 'login123', 'login1234', 'access123', 'access1234',
    'default1', 'default12', 'secret123', 'secret1234', 'pass1234',
    'passpass', 'pass@word', '1234qwer', 'qwer1234', '1234asdf',
    'asdf1234', 'asdfgh12', 'zxcvbn12', '123qweasd', 'asd12345',
    'qwe12345', 'trustno1', 'changeme', 'changeme1', 'whatever',
    'forever1', 'nothing1', 'baseball1', 'football1', 'hockey123',
    'love1234', 'baby1234', 'sexy1234', 'miss1234', 'angel1234',
    'hello123', 'hello1234', 'hello12345', 'world123', 'world1234',
    'flower123', 'flower1', 'chicken1', 'butter12', 'cheese12',
    'london12', 'paris123', 'berlin12', 'madrid12', 'brasil12',
    'brasil123', 'brazil12', 'brazil123', '123mudar', 'mudar123',
    'troca123', '123trocar', 'alterar1', '1alterar', 'novo1234',
    'novaSenha1', 'novasenha', 'novaSenha', 'minhasenha1', 'minha123',
    'stockflow', 'stock123', 'fluxo123', 'estoque1',
})


def _contem_similar(senha_lower: str, trecho: str) -> bool:
    """True se 'trecho' aparece dentro de 'senha' (case-insensitive) ou vice-versa."""
    t = trecho.lower().strip()
    return bool(t) and (t in senha_lower or senha_lower in t)


def validar_senha(senha: str, email: str = '', nome: str = '') -> str | None:
    """
    Retorna None se a senha é válida.
    Retorna uma string de erro em português se inválida.
    """
    if len(senha) < SENHA_MIN:
        return f'A senha deve ter pelo menos {SENHA_MIN} caracteres.'

    if senha.lower() in _SENHAS_COMUNS:
        return 'Esta senha é muito comum. Escolha uma senha mais segura.'

    s = senha.lower()

    if email:
        local = email.split('@')[0] if '@' in email else email
        if len(local) >= 3 and _contem_similar(s, local):
            return 'A senha não pode ser parecida com o e-mail.'

    if nome:
        for parte in nome.lower().split():
            if len(parte) >= 3 and _contem_similar(s, parte):
                return 'A senha não pode ser parecida com o nome.'

    return None
