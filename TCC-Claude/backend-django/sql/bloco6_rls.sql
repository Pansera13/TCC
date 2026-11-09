-- ============================================================
-- Bloco 6 — Row Level Security (RLS) em todas as tabelas
-- Aplicar no SQL Editor do Supabase
--
-- Contexto:
--   - O Django conecta como role "postgres" → tem BYPASSRLS nativo
--     no Supabase, portanto NÃO é bloqueado por esta mudança.
--   - As roles "anon" e "authenticated" (PostgREST / supabase-js)
--     ficam bloqueadas por padrão quando não há políticas permissivas.
--     O frontend NÃO usa supabase-js, então isso é seguro.
--   - Sem políticas criadas = nenhum acesso via PostgREST para
--     qualquer role que não seja postgres/service_role.
-- ============================================================

-- Tabelas de negócio
ALTER TABLE usuarios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes     ENABLE ROW LEVEL SECURITY;

-- Tabela de auditoria (criada no Bloco 4; aplique só se ela já existir)
ALTER TABLE eventos_seguranca ENABLE ROW LEVEL SECURITY;

-- ── REVERSÃO ────────────────────────────────────────────────
-- ALTER TABLE usuarios          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE movements         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE notificacoes      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE eventos_seguranca DISABLE ROW LEVEL SECURITY;
