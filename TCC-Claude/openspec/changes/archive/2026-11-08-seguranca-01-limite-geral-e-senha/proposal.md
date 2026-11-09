# Proposal

## Why

Auditoria das defesas de segurança Etapa 17, Bloco 1: verificar se o limite global de
requisições por IP e a política de senha já estão implementados e completos, e fechar
qualquer lacuna que reste.

## What Changes

- Confirmar que `GlobalRateLimitMiddleware` (api/middleware.py) está ativo, usa
  `ip_do_cliente` e tem testes que cobrem o comportamento básico (limite, 429, isenções).
- Confirmar que `validar_senha` (api/senha.py) é chamada em todos os pontos onde a senha
  é gravada: `register` e `redefinir_senha`. Não há endpoint de troca de senha no perfil.
- Fechar lacuna de teste: `TestPoliticaSenhaRegister` não tinha teste de aceitação
  (senha forte → 201); adicionar `test_senha_forte_retorna_201`.
- Corrigir docstring de `test_senha.py` que ainda listava `create_user (POST /api/users)`,
  rota inexistente após a remoção da área de Equipe.

## Capabilities

### Modified Capabilities

- `security/rate-limiting`: sem alteração de código; apenas confirmação de que todos os
  testes passam.
- `auth/register`: novo teste `test_senha_forte_retorna_201` que cobre o caminho feliz da
  validação de senha no cadastro.

## Impact

- **Arquivo modificado:** `api/tests/test_senha.py` (docstring + 1 novo teste).
- **Sem alteração de banco, sem nova rota, sem alteração de settings.**
