-- Reverte migracao_notificacoes.sql: remove gatilho, função, publicação e as duas tabelas
-- (as notificações guardadas são perdidas).
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificacoes_aviso'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE notificacoes_aviso;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_notificacoes_aviso ON notificacoes;
DROP FUNCTION IF EXISTS notificacoes_atualiza_aviso();
DROP TABLE IF EXISTS notificacoes_aviso;
DROP TABLE IF EXISTS notificacoes;

COMMIT;
