-- ============================================================
-- 002 - Estoque no Supabase + integração com Pedidos
-- Rode DEPOIS da 001_initial.sql, no SQL Editor do Supabase.
-- Os dois sistemas passam a usar o MESMO projeto Supabase (Postgres).
-- ============================================================

-- ------------------------------------------------------------
-- Estoque: usuários (login próprio do TCC Claude, JWT + bcrypt)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id                    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome                  VARCHAR(150) NOT NULL,
  nome_empresa          VARCHAR(150) NOT NULL,
  cpf_cnpj              VARCHAR(18)  NOT NULL UNIQUE,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  senha_hash            VARCHAR(255) NOT NULL,
  reset_code_hash       VARCHAR(255) NULL,
  reset_code_expires_at TIMESTAMPTZ  NULL,
  ativo                 BOOLEAN      NOT NULL DEFAULT TRUE,
  role                  TEXT         NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'user')),
  criado_em             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Estoque: produtos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id         INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome       VARCHAR(255)  NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  unidade    VARCHAR(10)   NOT NULL DEFAULT 'UN',
  peso_kg    NUMERIC(10,3) NULL,
  categoria  VARCHAR(100)  NULL,
  fornecedor VARCHAR(150)  NULL,
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Estoque: movimentações (entrada/saída)
-- user_id é nulo quando a saída vem do sistema de Pedidos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movements (
  id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id   INTEGER       NOT NULL,
  product_nome VARCHAR(255)  NOT NULL,
  tipo         TEXT          NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade   NUMERIC(10,3) NOT NULL,
  user_id      INTEGER       NULL,
  user_nome    VARCHAR(150)  NOT NULL,
  origem       TEXT          NOT NULL DEFAULT 'estoque' CHECK (origem IN ('estoque', 'pedido')),
  pedido_id    UUID          NULL REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_pedido  ON movements(pedido_id);

-- Itens de pedido passam a apontar para o produto real do estoque
ALTER TABLE itens_pedido
  DROP CONSTRAINT IF EXISTS itens_pedido_product_id_fkey;
ALTER TABLE itens_pedido
  ADD CONSTRAINT itens_pedido_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- ------------------------------------------------------------
-- RLS: tabelas do estoque ficam fechadas para anon/authenticated.
-- Só os backends (service_role, que ignora RLS) acessam.
-- ------------------------------------------------------------
ALTER TABLE usuarios  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- Função: paga o pedido e baixa o estoque de forma ATÔMICA.
-- Tudo ou nada: se qualquer item não tiver estoque, nada é baixado
-- e o pedido continua 'confirmado'.
-- Retorna: { ok: true, pedido_id } ou { ok: false, erros: [...] }
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION pagar_pedido(p_pedido_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pedido pedidos%ROWTYPE;
  v_item   RECORD;
  v_prod   products%ROWTYPE;
  v_erros  JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'nao_encontrado', 'mensagem', 'Pedido não encontrado.');
  END IF;
  IF v_pedido.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'acesso_negado', 'mensagem', 'Acesso negado.');
  END IF;
  IF v_pedido.status <> 'confirmado' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'status_invalido',
                              'mensagem', 'Apenas pedidos confirmados podem ser pagos.');
  END IF;

  -- 1) Trava os produtos (ordem fixa por id evita deadlock) e valida estoque
  FOR v_item IN
    SELECT ip.product_id, ip.product_nome, SUM(ip.quantidade) AS quantidade
    FROM itens_pedido ip
    WHERE ip.pedido_id = p_pedido_id
    GROUP BY ip.product_id, ip.product_nome
    ORDER BY ip.product_id
  LOOP
    SELECT * INTO v_prod FROM products WHERE id = v_item.product_id FOR UPDATE;

    IF NOT FOUND THEN
      v_erros := v_erros || jsonb_build_object(
        'product_id', v_item.product_id, 'product_nome', v_item.product_nome,
        'erro', 'Produto não encontrado no estoque.');
    ELSIF v_prod.quantidade < v_item.quantidade THEN
      v_erros := v_erros || jsonb_build_object(
        'product_id', v_item.product_id, 'product_nome', v_item.product_nome,
        'erro', 'Estoque insuficiente. Disponível: ' || v_prod.quantidade || '.');
    END IF;
  END LOOP;

  IF jsonb_array_length(v_erros) > 0 THEN
    UPDATE pedidos SET estoque_erros = v_erros WHERE id = p_pedido_id;
    RETURN jsonb_build_object('ok', false, 'codigo', 'estoque_insuficiente',
                              'mensagem', 'Estoque insuficiente. O pedido não foi pago.',
                              'erros', v_erros);
  END IF;

  -- 2) Baixa estoque + registra movimentação
  FOR v_item IN
    SELECT ip.product_id, ip.product_nome, SUM(ip.quantidade) AS quantidade
    FROM itens_pedido ip
    WHERE ip.pedido_id = p_pedido_id
    GROUP BY ip.product_id, ip.product_nome
    ORDER BY ip.product_id
  LOOP
    UPDATE products SET quantidade = quantidade - v_item.quantidade WHERE id = v_item.product_id;

    INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id)
    VALUES (v_item.product_id, v_item.product_nome, 'saida', v_item.quantidade,
            NULL, 'Sistema de Pedidos', 'pedido', p_pedido_id);
  END LOOP;

  -- 3) Marca como pago
  UPDATE pedidos SET status = 'pago', estoque_erros = NULL WHERE id = p_pedido_id;

  RETURN jsonb_build_object('ok', true, 'pedido_id', p_pedido_id, 'status', 'pago');
END;
$$;

-- Só o backend (service_role) pode chamar
REVOKE ALL ON FUNCTION pagar_pedido(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pagar_pedido(UUID, UUID) TO service_role;

-- ------------------------------------------------------------
-- View de leitura dos produtos para o catálogo do Pedidos
-- (opcional: o backend de Pedidos pode ler direto de `products`)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW produtos_catalogo AS
  SELECT id, nome, quantidade, unidade, categoria
  FROM products;

REVOKE ALL ON produtos_catalogo FROM PUBLIC, anon, authenticated;
GRANT SELECT ON produtos_catalogo TO service_role;

-- ------------------------------------------------------------
-- Endurecimento: status/estoque_erros só mudam pelo backend.
-- Sem isso, um usuário com a anon key poderia fazer UPDATE
-- direto em pedidos.status = 'pago' e pular a baixa de estoque.
-- ------------------------------------------------------------
REVOKE UPDATE ON pedidos FROM anon, authenticated;
