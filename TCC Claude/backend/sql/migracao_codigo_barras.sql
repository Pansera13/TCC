-- Adiciona coluna codigo_barras à tabela products
-- Execute uma única vez no Supabase SQL Editor

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

-- Índice para buscas rápidas por tenant + código de barras
CREATE INDEX IF NOT EXISTS idx_products_tenant_barcode
  ON products (tenant_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL;
