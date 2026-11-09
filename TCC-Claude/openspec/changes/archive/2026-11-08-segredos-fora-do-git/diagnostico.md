# Bloco 9 — Diagnóstico: Segredos no Histórico do Git

## Estado atual

| O que | Status | Risco |
|-------|--------|-------|
| `TCC-Claude/backend-django/.env` | ✅ NÃO rastreado — ignorado por `.env` no `.gitignore` | Nenhum |
| `TCC-Claude/frontend/.env` | ✅ NÃO rastreado — ignorado por `.env` no `.gitignore` | Nenhum |
| `TCC Claude/backend/.env` (Node.js antigo) | ⚠️ EM 5 COMMITS no histórico do GitHub | Alto |
| `TCC Claude/frontend/.env` (Node.js antigo) | ⚠️ Em commits históricos (apenas chaves públicas) | Baixo |
| `.env.example` | ✅ Rastreado — sem valores reais | Nenhum |

## Commits com segredos expostos

| Commit | Data | Arquivo exposto |
|--------|------|-----------------|
| `140d644` | 05/10 | `TCC Claude/backend/.env`, `TCC Claude/frontend/.env` |
| `e0c45db` | 13/10 | `TCC Claude/backend/.env`, `TCC Claude/frontend/.env` |
| `5ef198e` | 14/10 | `TCC Claude/backend/.env`, `TCC Claude/frontend/.env` |
| `aad3cd6` | 19/10 1.0 | `TCC Claude/backend/.env` |
| `7af87cb` | 19/10 1.1 | `TCC Claude/backend/.env`, `TCC Claude/frontend/.env` |

## Variáveis expostas (backend Node.js antigo)

```
DB_HOST, DB_USER, DB_PASS, DB_NAME   ← credenciais MySQL (provavelmente obsoletas)
JWT_SECRET, JWT_RESET_SECRET          ← ⚠️ RISCO ALTO se reusados no Django
RECAPTCHA_SECRET                      ← reCAPTCHA (pode ser rotacionado)
EMAIL_HOST, EMAIL_PORT, USER, PASS    ← Mailtrap dev (provavelmente obsoletas)
```

## Avaliação de risco

**Alto:** `JWT_SECRET` e `JWT_RESET_SECRET` — se os mesmos valores foram copiados
para o `.env` do Django, qualquer pessoa com acesso ao repo pode forjar tokens JWT
e autenticar-se como qualquer usuário.

**Médio:** `RECAPTCHA_SECRET` — pode ser rotacionado no Google reCAPTCHA Console.

**Baixo:** Credenciais MySQL e Mailtrap — eram de desenvolvimento, provavelmente
não são mais usadas.

## O que fazer

Ver `plano_acao.md` nesta pasta.
