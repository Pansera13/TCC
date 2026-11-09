# Tasks

## 1. Auditoria (somente leitura)

- [x] 1.1 Confirmar que `GlobalRateLimitMiddleware` está em MIDDLEWARE (settings.py) e
  usa `ip_do_cliente` de `api/limites.py`. Verificar com `python -m pytest
  api/tests/test_global_rate_limit.py` — 8 testes passando.
- [x] 1.2 Confirmar que `validar_senha` é chamada em `register` e `redefinir_senha`.
  Verificar que não há endpoint de troca de senha no perfil. Verificar com
  `python -m pytest api/tests/test_senha.py` — 37 testes passando.

## 2. Fechar lacunas

- [x] 2.1 Corrigir docstring do `test_senha.py`: remover referência a
  `create_user (POST /api/users)`.
- [x] 2.2 Adicionar `test_senha_forte_retorna_201` em `TestPoliticaSenhaRegister`:
  senha forte com e-mail de recuperação válido (`rec@hotmail.com`) → espera 201.

## 3. Verificação final

- [x] 3.1 Rodar `python -m pytest api/tests/test_global_rate_limit.py api/tests/test_senha.py -v`
  — esperado 38 testes passando (37 + 1 novo).
- [x] 3.2 Rodar `python -m pytest` completo — 0 falhas.
