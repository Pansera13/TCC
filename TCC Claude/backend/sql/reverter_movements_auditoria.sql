-- Desfaz migracao_movements_auditoria.sql.
-- ATENÇÃO: apaga os registros de edição e remoção (e a coluna `detalhes`), pois o CHECK antigo não os aceita.
BEGIN;

DELETE FROM movements WHERE tipo IN ('edicao', 'remocao');

DROP INDEX IF EXISTS idx_movements_tipo_created;
DROP INDEX IF EXISTS idx_movements_user;
ALTER TABLE movements DROP COLUMN IF EXISTS detalhes;

ALTER TABLE movements DROP CONSTRAINT movements_tipo_check;
ALTER TABLE movements ADD CONSTRAINT movements_tipo_check
  CHECK (tipo IN ('entrada', 'saida'));

COMMIT;
