-- Tabela de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmado', 'pago')),
  estoque_erros JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de itens do pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL,
  product_nome  TEXT NOT NULL,
  quantidade    NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  unidade       TEXT NOT NULL DEFAULT 'UN',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_id ON itens_pedido(pedido_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row Level Security (RLS) - Task 1.3
-- ============================================================

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;

-- Políticas para pedidos: usuário só acessa os próprios pedidos
CREATE POLICY "pedidos_select_own" ON pedidos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pedidos_insert_own" ON pedidos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pedidos_update_own" ON pedidos
  FOR UPDATE USING (auth.uid() = user_id);

-- Políticas para itens_pedido: acesso via pedido do próprio usuário
CREATE POLICY "itens_select_own" ON itens_pedido
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid())
  );

CREATE POLICY "itens_insert_own" ON itens_pedido
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid())
  );

CREATE POLICY "itens_delete_own" ON itens_pedido
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid())
  );
