-- Reverte migracao_arquivar_produtos.sql.
-- Restaura antes o que estiver arquivado, para nenhum produto sumir do estoque.
BEGIN;
UPDATE products SET arquivado = false WHERE arquivado;
DROP INDEX IF EXISTS idx_products_arquivado;
ALTER TABLE products DROP COLUMN IF EXISTS arquivado_em;
ALTER TABLE products DROP COLUMN IF EXISTS arquivado;
COMMIT;
