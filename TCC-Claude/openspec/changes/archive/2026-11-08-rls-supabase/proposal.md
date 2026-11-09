# Bloco 6 — Row Level Security (RLS) nas tabelas do Supabase

## Problema
As tabelas do projeto (usuarios, products, movements, notificacoes, eventos_seguranca)
estão acessíveis diretamente via PostgREST/supabase-js pelas roles `anon` e
`authenticated`, caso alguém descubra a URL do projeto Supabase e a chave pública.

## Solução
Habilitar RLS em todas as tabelas sem criar políticas para `anon`/`authenticated`.
Resultado: acesso direto via PostgREST bloqueado por padrão.
O Django conecta como `postgres`, que tem BYPASSRLS — não é afetado.

## Entregável
SQL em `backend-django/sql/bloco6_rls.sql` para aplicar no SQL Editor do Supabase.
Reversão documentada no mesmo arquivo.
