-- Recuperação de conta: e-mail de recuperação e controle de tentativas do código.
-- Só colunas anuláveis ou com valor padrão; nenhum dado existente é alterado.
-- Reversão: reverter_recuperacao_conta.sql
--
-- ANTES DE APLICAR, confira se as colunas abaixo já existem em usuarios (e o tipo delas):
--   SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'usuarios' AND column_name IN ('reset_code_hash', 'reset_code_expires_at');
-- Esperado: reset_code_hash = text/varchar, reset_code_expires_at = timestamp (com ou sem fuso).
BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_recuperacao text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_code_hash text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_code_expires_at timestamptz;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS reset_code_tentativas integer NOT NULL DEFAULT 0;
COMMIT;

-- Conferência: as 4 colunas devem aparecer.
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN ('email_recuperacao', 'reset_code_hash', 'reset_code_expires_at', 'reset_code_tentativas')
ORDER BY column_name;
