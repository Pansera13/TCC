-- Adiciona coluna mesa ao pedido
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS mesa INTEGER;
