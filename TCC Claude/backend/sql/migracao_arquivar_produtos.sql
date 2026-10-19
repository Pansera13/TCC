-- Arquivar produtos: adiciona as colunas de arquivamento em products.
-- Só adiciona colunas com padrão false; os produtos existentes continuam ativos.
-- Aplicar ANTES de subir o backend novo (listProducts passa a filtrar por arquivado).
-- Reversão: reverter_arquivar_produtos.sql
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;
CREATE INDEX IF NOT EXISTS idx_products_arquivado ON products (arquivado) WHERE arquivado;
COMMIT;

-- Conferência (rode depois): deve listar as 2 colunas e 0 arquivados
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('arquivado', 'arquivado_em');
SELECT COUNT(*) FILTER (WHERE arquivado) AS arquivados, COUNT(*) AS total FROM products;
