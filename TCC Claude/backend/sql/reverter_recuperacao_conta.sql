-- Reverte migracao_recuperacao_conta.sql.
-- Remove só o que a migração criou com certeza. reset_code_hash e reset_code_expires_at
-- podem já existir de antes (migração do MySQL), por isso NÃO são removidas.
BEGIN;
ALTER TABLE usuarios DROP COLUMN IF EXISTS reset_code_tentativas;
ALTER TABLE usuarios DROP COLUMN IF EXISTS email_recuperacao;
COMMIT;
