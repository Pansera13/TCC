# Proposal

## Why

As configurações de HTTPS e CORS de produção já estão no `settings.py`
(SECURE_SSL_REDIRECT, HSTS, CORS via ALLOWED_ORIGINS, ALLOWED_HOSTS fechado), mas
o servidor consegue subir sem essas variáveis definidas, usando fallbacks que são
adequados em desenvolvimento mas inseguros em produção. O risco: um deploy esqueceu
de definir ALLOWED_ORIGINS e o servidor sobe expondo CORS aberto para RFC1918.

## What Changes

- Novo system check Django (`api/apps.py`): quando `DJANGO_ENV=production`,
  retorna `Error` se `ALLOWED_HOSTS` ou `ALLOWED_ORIGINS` não estão definidos.
  Erros de sistema previnem o servidor de subir.
- `settings.py`: quando `DJANGO_ENV=production`, força `DEBUG=False`
  independentemente da env var `DEBUG`.
- `.env.example`: documenta `DJANGO_ENV` e os valores aceitos.
- Novos testes de configuração de produção.
- Frontend: confirmado sem localhost fixo (usa `VITE_API_URL` ou URL relativa).

## Capabilities

### Modified Capabilities

- `security/http-security-headers`: servidor agora recusa start em produção sem
  ALLOWED_HOSTS e ALLOWED_ORIGINS.

## Impact

- **Arquivos modificados:** `api/apps.py`, `stockflow/settings.py`, `.env.example`.
- **Novo arquivo:** `api/tests/test_config_producao.py`.
- **Sem alteração de banco, sem nova rota.**
