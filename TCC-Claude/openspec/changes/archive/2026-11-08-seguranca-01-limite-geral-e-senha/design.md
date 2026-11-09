# Design

## Auditoria — resultado

### Limite geral (GlobalRateLimitMiddleware)

| Item | Estado |
|------|--------|
| Middleware existe e está no MIDDLEWARE list (settings.py) | ✓ Concluído |
| Usa `ip_do_cliente()` de `api/limites.py` | ✓ Concluído |
| Configurável por env vars (GLOBAL_RATE_LIMIT_MAX, _JANELA_SEGUNDOS, _BLOQUEIO_SEGUNDOS) | ✓ Concluído |
| Resposta 429 com `retry_after` e cabeçalho `Retry-After` | ✓ Concluído |
| OPTIONS e rotas fora de /api/ isentas | ✓ Concluído |
| MAX=0 desabilita o middleware | ✓ Concluído |
| Testes (test_global_rate_limit.py — 8 testes) | ✓ Passando |

### Política de senha (validar_senha)

| Item | Estado |
|------|--------|
| Mínimo 8 caracteres | ✓ Concluído |
| Rejeita senhas da lista de comuns (~300) | ✓ Concluído |
| Rejeita senhas similares ao e-mail ou nome | ✓ Concluído |
| Chamada em `register` (api/views/auth.py) | ✓ Concluído |
| Chamada em `redefinir_senha` (api/views/recuperacao.py) | ✓ Concluído |
| Sem endpoint de troca de senha no perfil | Confirmado — não existe |
| Testes unitários de validar_senha (21 testes) | ✓ Passando |
| Testes de integração — register (3 testes) | ✓ Passando — só rejeições |
| Testes de integração — redefinir (4 testes) | ✓ Passando — incl. aceitação |

### Lacunas encontradas

1. **`TestPoliticaSenhaRegister`** sem teste de aceitação (senha forte → 201).
   `TestPoliticaSenhaRedefinir` já tem `test_senha_forte_retorna_200`; register precisava
   do par equivalente.
2. **Docstring** de `test_senha.py` referenciava `create_user (POST /api/users)`, rota
   removida.

## Solução

Adicionar ao final de `TestPoliticaSenhaRegister`:

```python
def test_senha_forte_retorna_201(self, db):
    corpo = {
        'nome': 'Usuario Teste',
        'nome_empresa': 'Empresa Teste',
        'cpf_cnpj': _cpf(),
        'email': _email(),
        'senha': 'Rj#8Lm2v!QzP',
        'email_recuperacao': 'rec@hotmail.com',
        'email_recuperacao_confirmacao': 'rec@hotmail.com',
    }
    c = Client()
    resp = c.post(self.URL, data=json.dumps(corpo), content_type='application/json')
    assert resp.status_code == 201
```

Nota: o endpoint usa `bcrypt.gensalt(rounds=12)` → este teste leva ~0,3–0,5 s, o que é
esperado para o caminho feliz do cadastro.

Corrigir docstring para listar apenas `register` e `redefinir_senha`.
