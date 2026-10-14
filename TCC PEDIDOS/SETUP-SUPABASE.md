# Setup do Supabase (um projeto para Pedidos + Estoque)

## 1. Criar o projeto (só você pode — exige sua conta)
1. https://supabase.com/dashboard -> **New project**
2. Nome `tcc-estoque-pedidos`, região South America (São Paulo). **Guarde a senha do banco.**

## 2. Rodar o SQL
SQL Editor -> New query -> cole e execute, **nesta ordem**:
1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_estoque_integracao.sql`

## 3. Pegar as chaves e preencher os .env

| Onde no painel | Variável | Arquivo |
|---|---|---|
| Settings > API > Project URL | `SUPABASE_URL` / `VITE_SUPABASE_URL` | `TCC PEDIDOS/backend/.env` e `frontend/.env` |
| Settings > API > `anon` `public` | `VITE_SUPABASE_ANON_KEY` | `TCC PEDIDOS/frontend/.env` |
| Settings > API > `service_role` `secret` | `SUPABASE_SERVICE_KEY` | `TCC PEDIDOS/backend/.env` (NUNCA no frontend) |
| Connect > Session pooler > URI | `DATABASE_URL` | `TCC Claude/backend/.env` |

Se o painel mostrar chaves novas `sb_publishable_...` / `sb_secret_...`, use-as no lugar de anon / service_role.

## 4. Auth
Authentication > Providers > Email ligado. Para testar rápido, desligue "Confirm email".
Crie um usuário em Authentication > Users para logar no Pedidos.

## 5. Portas
- Estoque: backend 3001, frontend 5173
- Pedidos: backend 3002, frontend 5174 (`npm run dev -- --port 5174`)

## 6. Próximo passo
Cole `prompts/prompt-estoque.md` (no projeto TCC Claude) e `prompts/prompt-pedidos.md` (no TCC PEDIDOS) no OpenSpec.
