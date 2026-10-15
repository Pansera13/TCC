-- Auditoria em Movimentações: aceita edição e remoção de produto.
-- Aditiva: só alarga o CHECK de `tipo`, adiciona uma coluna anulável e dois índices.
-- A função pagar_pedido e o sistema de Pedidos continuam inserindo apenas 'entrada'/'saida'.
-- Reversão: backend/sql/reverter_movements_auditoria.sql
BEGIN;

ALTER TABLE movements DROP CONSTRAINT movements_tipo_check;
ALTER TABLE movements ADD CONSTRAINT movements_tipo_check
  CHECK (tipo IN ('entrada', 'saida', 'edicao', 'remocao'));

-- Valores anteriores/novos de uma edição: { "antes": {...}, "depois": {...} }
ALTER TABLE movements ADD COLUMN detalhes jsonb;

CREATE INDEX idx_movements_user ON movements (user_id);
CREATE INDEX idx_movements_tipo_created ON movements (tipo, created_at DESC);

COMMIT;
