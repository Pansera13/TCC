# Proposal

## Why

O desenvolvimento do TCC alterna entre o PC e o notebook, e os dois precisam se conectar ao mesmo projeto Supabase. Hoje o `.gitignore` da raiz bloqueia `.env`, `frontend/.env` e `backend/.env`, então a cada troca de máquina as variáveis precisam ser copiadas manualmente.

## What Changes

- Remover do `.gitignore` da raiz as entradas `.env`, `frontend/.env` e `backend/.env`, para que os arquivos de ambiente passem a ser versionados.
- Commitar `frontend/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`) e `backend/.env` (`DATABASE_URL`, `JWT_SECRET`, `JWT_RESET_SECRET`, `RECAPTCHA_SECRET`, `EMAIL_*`, `PORT`).
- Manter os `.env.example` existentes como referência.

**Risco aceito pelo usuário:** o `backend/.env` contém segredos (senha do banco Supabase, segredos JWT, senha de e-mail, chave reCAPTCHA). Versioná-los só é aceitável enquanto o repositório `Pansera13/TCC` for **privado**. Depois de commitados, os segredos ficam no histórico do git mesmo se removidos depois.

## Capabilities

### New Capabilities
<!-- Nenhuma: mudança de configuração do repositório, sem alteração de comportamento do sistema. -->

### Modified Capabilities
<!-- Nenhuma. A change usa `skip_specs: true`. -->

## Impact

- `.gitignore` (raiz): três entradas removidas.
- `frontend/.env` e `backend/.env`: passam a ser rastreados pelo git e enviados ao `origin` (https://github.com/Pansera13/TCC).
- Nenhum código de aplicação muda.
