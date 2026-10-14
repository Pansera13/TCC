Você está controlando meu navegador. Já estou LOGADO no Supabase (conta panseratcc69@gmail.com) em https://supabase.com/dashboard. Não peça nem digite senha; se aparecer tela de login, pare e me avise.

OBJETIVO: deixar um único projeto Supabase pronto para dois sistemas (Estoque e Pedidos) e me devolver os valores de conexão. Não clique em nada destrutivo (delete/pause/reset) e não mexa em outros projetos.

## Passo 1 – Projeto
- Se já existir um projeto chamado `tcc-estoque-pedidos`, use-o. Senão: New project, nome `tcc-estoque-pedidos`, região South America (São Paulo), clique em "Generate a password" para a senha do banco e ME MOSTRE essa senha na resposta final (preciso guardá-la). Aguarde o projeto ficar "Healthy".

## Passo 2 – Rodar o SQL
Abra SQL Editor > New query. Cole e execute (Run) o bloco A, confirme "Success", depois abra outra query e execute o bloco B. Se der erro, copie a mensagem exata e pare.

### Bloco A
```sql
CREATE TABLE IF NOT EXISTS pedidos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'confirmado', 'pago')),
  estoque_erros JSONB NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS itens_pedido (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id     UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  product_id    INTEGER NOT NULL,
  product_nome  TEXT NOT NULL,
  quantidade    NUMERIC(10,3) NOT NULL CHECK (quantidade > 0),
  unidade       TEXT NOT NULL DEFAULT 'UN',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_user_id ON pedidos(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_id ON itens_pedido(pedido_id);
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_select_own" ON pedidos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pedidos_insert_own" ON pedidos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pedidos_update_own" ON pedidos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "itens_select_own" ON itens_pedido FOR SELECT USING (
  EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid()));
CREATE POLICY "itens_insert_own" ON itens_pedido FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid()));
CREATE POLICY "itens_delete_own" ON itens_pedido FOR DELETE USING (
  EXISTS (SELECT 1 FROM pedidos WHERE pedidos.id = itens_pedido.pedido_id AND pedidos.user_id = auth.uid()));
```

### Bloco B
```sql
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  nome_empresa VARCHAR(150) NOT NULL,
  cpf_cnpj VARCHAR(18) NOT NULL UNIQUE,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  reset_code_hash VARCHAR(255) NULL,
  reset_code_expires_at TIMESTAMPTZ NULL,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','user')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  unidade VARCHAR(10) NOT NULL DEFAULT 'UN',
  peso_kg NUMERIC(10,3) NULL,
  categoria VARCHAR(100) NULL,
  fornecedor VARCHAR(150) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS movements (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id INTEGER NOT NULL,
  product_nome VARCHAR(255) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade NUMERIC(10,3) NOT NULL,
  user_id INTEGER NULL,
  user_nome VARCHAR(150) NOT NULL,
  origem TEXT NOT NULL DEFAULT 'estoque' CHECK (origem IN ('estoque','pedido')),
  pedido_id UUID NULL REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at);
CREATE INDEX IF NOT EXISTS idx_movements_pedido ON movements(pedido_id);

ALTER TABLE itens_pedido DROP CONSTRAINT IF EXISTS itens_pedido_product_id_fkey;
ALTER TABLE itens_pedido ADD CONSTRAINT itens_pedido_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION pagar_pedido(p_pedido_id UUID, p_user_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pedido pedidos%ROWTYPE;
  v_item RECORD;
  v_prod products%ROWTYPE;
  v_erros JSONB := '[]'::jsonb;
BEGIN
  SELECT * INTO v_pedido FROM pedidos WHERE id = p_pedido_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'nao_encontrado', 'mensagem', 'Pedido não encontrado.');
  END IF;
  IF v_pedido.user_id <> p_user_id THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'acesso_negado', 'mensagem', 'Acesso negado.');
  END IF;
  IF v_pedido.status <> 'confirmado' THEN
    RETURN jsonb_build_object('ok', false, 'codigo', 'status_invalido', 'mensagem', 'Apenas pedidos confirmados podem ser pagos.');
  END IF;

  FOR v_item IN
    SELECT ip.product_id, ip.product_nome, SUM(ip.quantidade) AS quantidade
    FROM itens_pedido ip WHERE ip.pedido_id = p_pedido_id
    GROUP BY ip.product_id, ip.product_nome ORDER BY ip.product_id
  LOOP
    SELECT * INTO v_prod FROM products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      v_erros := v_erros || jsonb_build_object('product_id', v_item.product_id, 'product_nome', v_item.product_nome, 'erro', 'Produto não encontrado no estoque.');
    ELSIF v_prod.quantidade < v_item.quantidade THEN
      v_erros := v_erros || jsonb_build_object('product_id', v_item.product_id, 'product_nome', v_item.product_nome, 'erro', 'Estoque insuficiente. Disponível: ' || v_prod.quantidade || '.');
    END IF;
  END LOOP;

  IF jsonb_array_length(v_erros) > 0 THEN
    UPDATE pedidos SET estoque_erros = v_erros WHERE id = p_pedido_id;
    RETURN jsonb_build_object('ok', false, 'codigo', 'estoque_insuficiente', 'mensagem', 'Estoque insuficiente. O pedido não foi pago.', 'erros', v_erros);
  END IF;

  FOR v_item IN
    SELECT ip.product_id, ip.product_nome, SUM(ip.quantidade) AS quantidade
    FROM itens_pedido ip WHERE ip.pedido_id = p_pedido_id
    GROUP BY ip.product_id, ip.product_nome ORDER BY ip.product_id
  LOOP
    UPDATE products SET quantidade = quantidade - v_item.quantidade WHERE id = v_item.product_id;
    INSERT INTO movements (product_id, product_nome, tipo, quantidade, user_id, user_nome, origem, pedido_id)
    VALUES (v_item.product_id, v_item.product_nome, 'saida', v_item.quantidade, NULL, 'Sistema de Pedidos', 'pedido', p_pedido_id);
  END LOOP;

  UPDATE pedidos SET status = 'pago', estoque_erros = NULL WHERE id = p_pedido_id;
  RETURN jsonb_build_object('ok', true, 'pedido_id', p_pedido_id, 'status', 'pago');
END;
$$;

REVOKE ALL ON FUNCTION pagar_pedido(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION pagar_pedido(UUID, UUID) TO service_role;

CREATE OR REPLACE VIEW produtos_catalogo AS SELECT id, nome, quantidade, unidade, categoria FROM products;
REVOKE ALL ON produtos_catalogo FROM PUBLIC, anon, authenticated;
GRANT SELECT ON produtos_catalogo TO service_role;

REVOKE UPDATE ON pedidos FROM anon, authenticated;
```

## Passo 3 – Verificar
Em Table Editor, confirme que existem: pedidos, itens_pedido, usuarios, products, movements. Em Database > Functions, confirme `pagar_pedido`.

## Passo 4 – Auth
Authentication > Sign In / Providers > Email: deixe ligado e DESLIGUE "Confirm email" (ambiente de teste). Depois em Authentication > Users > Add user > Create new user: email `panseratcc69@gmail.com`, senha que EU digitar (se pedir senha, pare e me peça; não invente uma).

## Passo 5 – Coletar valores de conexão
Mostre na resposta final, em um bloco de texto, exatamente:
- Project URL (Settings > API)  -> SUPABASE_URL
- anon / publishable key (Settings > API Keys) -> VITE_SUPABASE_ANON_KEY
- service_role / secret key (Settings > API Keys; clique em "Reveal") -> SUPABASE_SERVICE_KEY
- Connection string "Session pooler" (botão Connect > Connection string > Session pooler > URI), com [YOUR-PASSWORD] substituído pela senha do banco -> DATABASE_URL
- A senha do banco, se você a gerou no Passo 1.

## Passo 6 – Resumo
Liste o que fez, o que falhou e qualquer erro exato. Não declare sucesso sem ter visto as 5 tabelas e a função no painel.
