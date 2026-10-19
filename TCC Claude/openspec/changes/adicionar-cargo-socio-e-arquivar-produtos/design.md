## Context

Estado observado no código e no banco em 16/10/2026:

- **Cargos hoje**: `usuarios.role` é `text` com `CHECK usuarios_role_check`. A restrição **já foi ampliada** para `('admin','socio','user')` por um pedido anterior (`backend/sql/migracao_cargo_socio.sql`, aplicada). Existem 2 contas: 1 admin e 1 `user`.
- **Modelo implementado até aqui** (será substituído): `backend/src/utils/roles.js` e `frontend/src/utils/roles.js` com `rank`, `isGestor` (admin ou sócio) e `podeGerenciar` (alvo de nível igual ou inferior). Nele o Sócio tem as mesmas funções do Administrador, exceto agir sobre cargos superiores; `middleware/admin.js` libera qualquer gestor; `routes/users.js` inteiro é "gestor". O Sócio hoje pode mudar cargos, excluir usuários e excluir produtos, o que a nova matriz proíbe.
- **Auth**: `middleware/auth.js` já consulta o banco a cada requisição (conta ativa, cargo e nome atuais) e responde 401/503. `authController.login` devolve `role`; `routes/profile.js` GET devolve `role`.
- **Produtos**: `routes/products.js` deixa `POST /`, `PUT /:id`, `POST /:id/withdraw` abertos a qualquer autenticado (só a interface esconde Editar/Novo para não gestores); `DELETE /:id` usa `adminMiddleware`. `listProducts` devolve todos. Não existe rota de Entrada em produto existente: entrada só é gravada em `createProduct`. `itens_pedido.product_id → products(id) ON DELETE RESTRICT` (exclusão de produto em pedido dá 409).
- **Movimentações**: `movements` não tem FK para `products` e guarda `product_nome`; `tipo` aceita `entrada, saida, edicao, remocao`. `listMovements` é aberto a qualquer autenticado.
- **Relatórios**: `reportController` calcula tudo de `products` e `movements` (entrada/saida).
- **Frontend**: `Dashboard.jsx` usa `isAdmin = isGestor(user.role)`; `ALL_NAV_ITEMS` com `adminOnly` para Equipe; Realtime do Supabase em `products` (INSERT/UPDATE/DELETE) mais polling de 20 s; `AddUserModal` recebe `cargos`; rótulos vêm de `utils/roles.js` ("Operador").
- **Sistema de Pedidos** compartilha o Supabase e não conhece colunas novas.

## Goals / Non-Goals

**Goals:**
- Três cargos com herança e uma matriz de permissões única, imposta no backend.
- Arquivar/restaurar produto sem perder histórico, compatível com o Realtime.
- Entrada em produto existente para todos os cargos.
- Frontend apenas reflete as permissões que o servidor informa.

**Non-Goals:**
- Impedir remover/rebaixar o último Administrador (registrado em Riscos).
- Multi-empresa (as contas e produtos continuam num único espaço, como hoje).
- Adaptar o sistema de Pedidos para ignorar produtos arquivados.
- Alterar o fluxo de recuperação de senha ou de cadastro da conta dona (continua criando `admin` pelo default do banco).

## Decisions

### D1. Fonte única: matriz no backend, frontend lê do servidor
- Novo `backend/src/utils/permissoes.js` (substitui `utils/roles.js`): níveis `{ user: 1, socio: 2, admin: 3 }` e um mapa `permissão → nível mínimo`. `can(cargo, permissao)` compara níveis, e a herança sai de graça.
- Permissões (chaves):
  - `user`: `estoque:ver`, `produto:retirar`, `produto:entrada`, `movimentacao:ver-proprias`.
  - `socio`: `produto:cadastrar`, `produto:editar`, `produto:arquivar`, `produto:importar-nfe`, `relatorio:ver`, `movimentacao:ver-todas`, `equipe:ver`, `usuario:criar-funcionario`, `usuario:status-funcionario`.
  - `admin`: `produto:restaurar`, `produto:excluir`, `produto:ver-arquivados`, `usuario:excluir`, `usuario:criar-privilegiado`, `usuario:alterar-cargo`, `usuario:gerenciar-privilegiado`.
- Middleware `exigePermissao('produto:arquivar')` (403 com "Você não tem permissão para esta ação."), usado em cada rota; `middleware/admin.js` deixa de existir.
- Regras sobre contas (precisam do alvo, então ficam no controller, usando a mesma matriz): `podeAlterarConta(ator, alvo)` = Administrador pode qualquer conta que não seja a própria; Sócio só se o alvo for `user`; `podeCriarCargo(ator, cargo)` = Sócio só `user`, Administrador qualquer. Ninguém muda o próprio cargo (nem Administrador).
- O frontend recebe `permissoes: string[]` em `POST /api/auth/login` e em `GET /api/profile` (já chamado ao abrir o painel, o que também corrige sessão antiga) e guarda na sessão (`AuthContext`). `utils/roles.js` do frontend vira só rótulos e `can(permissao)` sobre essa lista. **Alternativa descartada**: duplicar a matriz em JS nos dois pacotes (divergiria) ou um JSON compartilhado fora de `frontend/` (exige configurar o Vite e o build).

### D2. Rotas e níveis
| Rota | Permissão |
|---|---|
| `GET /products` | `estoque:ver` (sem arquivados) |
| `GET /products?arquivados=1` | `produto:ver-arquivados` |
| `POST /products` | `produto:cadastrar` |
| `PUT /products/:id` | `produto:editar` |
| `POST /products/:id/withdraw` | `produto:retirar` |
| `POST /products/:id/entry` (nova) | `produto:entrada` |
| `POST /products/:id/archive` (nova) | `produto:arquivar` |
| `POST /products/:id/restore` (nova) | `produto:restaurar` |
| `DELETE /products/:id` | `produto:excluir` |
| `GET /nfe/:chave` | `produto:importar-nfe` |
| `GET /reports` | `relatorio:ver` |
| `GET /movements`, `/movements/users` | `estoque:ver`; Funcionário só recebe as próprias linhas |
| `GET /users` | `equipe:ver` |
| `POST /users` | `usuario:criar-funcionario` e, se o cargo pedido não for `user`, `usuario:criar-privilegiado` |
| `PUT /users/:id/status` | `usuario:status-funcionario` e, se o alvo não for `user`, `usuario:gerenciar-privilegiado` |
| `PUT /users/:id/role` | `usuario:alterar-cargo` (e nunca o próprio) |
| `DELETE /users/:id` | `usuario:excluir` (e nunca o próprio) |

### D3. Arquivar produto
- Colunas `products.arquivado boolean not null default false` e `arquivado_em timestamptz` (SQL em "SQL para revisão").
- `listProducts` filtra `WHERE arquivado = false`; com `?arquivados=1` (Administrador) devolve só os arquivados. Retirada, entrada e edição usam `... AND arquivado = false` e respondem 409 "Produto arquivado." quando não afetam linha.
- `archive`: `UPDATE products SET arquivado = true, arquivado_em = now()`; `restore`: `arquivado = false, arquivado_em = null`. Ambos gravam `logMovement` do tipo `edicao` com `detalhes { antes: { arquivado }, depois: { arquivado } }`. **Decisão**: reutilizar `edicao` evita nova alteração do `CHECK` de `movements.tipo` (o frontend só ganha o rótulo "Arquivado" em `CAMPOS`). Alternativa descartada: tipos `arquivamento`/`restauracao`, que exigiriam outro SQL na tabela compartilhada.
- Exclusão definitiva continua `DELETE` (com 409 se em pedido); permanece `logMovement` de `remocao`.
- **Realtime**: o handler de UPDATE passa a tratar `updated.arquivado`: se `true`, remove o item do estado; se `false` e o item não está no estado, insere (restauração). O INSERT/DELETE continuam como estão. A visão Arquivados (Administrador) busca com `?arquivados=1` ao abrir e após cada ação.
- **Relatórios**: `products` filtrado por `arquivado = false`; para `movements`, todas as consultas (totais, top, giro, consumo) excluem linhas cujo `product_id` pertence a produto arquivado (`NOT EXISTS`); produtos já excluídos continuam como hoje.
- Frontend: no `EditProductModal`, o Sócio vê "Arquivar produto" (confirmação em duas etapas); o Administrador vê "Arquivar" e, na visão Arquivados, "Restaurar" e "Excluir definitivamente". O botão "Remover produto" atual vira "Arquivar" para o Sócio e continua como exclusão só para o Administrador.

### D4. Entrada em produto existente
`POST /api/products/:id/entry { quantidade }`: valida número > 0, `UPDATE products SET quantidade = quantidade + $1 WHERE id = $2 AND arquivado = false RETURNING nome`, `logMovement` tipo `entrada` (origem `estoque`). Frontend: botão "Entrada" ao lado de "Retirar" em Lista, Acordeão, Grade e Compacto, com modal simples de quantidade (reaproveitando o padrão do `WithdrawModal`).

### D5. Movimentações e Funcionário
Hipótese registrada: "histórico completo" é do Sócio em diante; o Funcionário vê Movimentações restrito às próprias ações (`WHERE user_id = req.user.id`), com os mesmos filtros. A aba continua visível para ele, conforme a matriz.

### D6. Rótulos e contas existentes
Rótulos: `user` = Funcionário, `socio` = Sócio, `admin` = Administrador; "Operador" some de todas as telas, inclusive do menu de perfil e do cadastro. Nenhuma migração de dados: contas `user` continuam `user`.

## SQL para revisão (aplicar manualmente no Supabase antes do apply)

Nada abaixo é aplicado pela implementação.

**A. Restrição de cargo — já aplicada em 16/10/2026** (apenas conferir):
```sql
-- conferência
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'usuarios_role_check';
-- esperado: CHECK ((role = ANY (ARRAY['admin'::text, 'socio'::text, 'user'::text])))

-- se, em outro ambiente, ainda não estiver aplicada:
BEGIN;
ALTER TABLE usuarios DROP CONSTRAINT usuarios_role_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_role_check CHECK (role IN ('admin', 'socio', 'user'));
COMMIT;
-- reversão: backend/sql/reverter_cargo_socio.sql (contas 'socio' viram 'user')
```

**B. Colunas de arquivamento em `products` — pendente** (arquivo previsto: `backend/sql/migracao_arquivar_produtos.sql`):
```sql
BEGIN;
ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivado boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS arquivado_em timestamptz;
CREATE INDEX IF NOT EXISTS idx_products_arquivado ON products (arquivado) WHERE arquivado;
COMMIT;

-- conferência
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' AND column_name IN ('arquivado', 'arquivado_em');
SELECT COUNT(*) FILTER (WHERE arquivado) AS arquivados, COUNT(*) AS total FROM products;  -- 0 e 649 (hoje)
```
Reversão (`backend/sql/reverter_arquivar_produtos.sql`): restaurar antes o que estiver arquivado, para nada sumir do estoque.
```sql
BEGIN;
UPDATE products SET arquivado = false WHERE arquivado;
DROP INDEX IF EXISTS idx_products_arquivado;
ALTER TABLE products DROP COLUMN IF EXISTS arquivado_em;
ALTER TABLE products DROP COLUMN IF EXISTS arquivado;
COMMIT;
```
Por que é seguro: só adiciona colunas com valor padrão `false`; linhas existentes ficam ativas. O Realtime publica a linha inteira no UPDATE, então as colunas novas chegam no evento. Nenhuma alteração em `movements` (o arquivamento reutiliza o tipo `edicao`).

## Risks / Trade-offs

- [Sistema de Pedidos continua listando produtos arquivados] → coluna nova ignorada por ele; avisar ou adaptar a consulta dele (`WHERE NOT arquivado`) fora deste repositório.
- [Último Administrador pode ser removido ou rebaixado] → só outro Administrador consegue, e ninguém altera a própria conta; deixado fora do escopo e registrado.
- [Substituição do modelo anterior muda permissões já entregues ao Sócio (mudar cargos, excluir)] → intencional e descrito em "What Changes"; testar contra a matriz nova.
- [Entre o deploy do backend e o SQL B] → o backend deve ser aplicado somente depois do SQL B, senão `listProducts` falha por coluna inexistente; a tarefa 1.1 é uma pausa explícita.
- [Funcionário vendo só as próprias movimentações é uma interpretação] → registrada como hipótese; ajustar se a intenção for outra.
- [Somar entrada sem unidade] → igual à retirada: quantidade na unidade do produto, sem conversão.
- [Realtime reinsere produto restaurado só quando o UPDATE chega] → o polling de 20 s cobre perda de evento.

## Migration Plan

1. Você revisa e aplica o SQL B (e confere o A). A implementação não toca no banco.
2. Backend (permissões, rotas, arquivar/restaurar/entrada, filtros), com testes de API por cargo.
3. Frontend (permissões do servidor, Equipe, botões, Arquivados, Entrada, rótulos).
4. Verificação por cargo na API e na interface.
5. Reversão: `reverter_arquivar_produtos.sql`; o código antigo continua funcionando porque as colunas novas são aditivas.
