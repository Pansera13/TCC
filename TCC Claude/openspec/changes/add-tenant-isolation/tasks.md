# Tasks

## 1. Migration do banco

- [x] 1.1 Criar `backend/sql/add_tenant_id.sql` com ALTER TABLE para adicionar `tenant_id INTEGER` em `usuarios`, `products` e `movements`, e os UPDATE de migration para dados existentes — verificar que o arquivo contém os 3 ALTER e os UPDATE de dados existentes
- [x] 1.2 Executar a migration no Supabase (via script Node ou manualmente) e verificar que `SELECT tenant_id FROM usuarios LIMIT 5` retorna valores não nulos

## 2. Model e controller de autenticação

- [x] 2.1 Em `User.js`, atualizar `create` para retornar o `id` inserido e executar `UPDATE usuarios SET tenant_id = $1 WHERE id = $1` em seguida — verificar que novo usuário tem `tenant_id = id`
- [x] 2.2 Em `authController.js`, incluir `tenant_id` no payload do JWT no `login` — verificar que o token decodificado contém o campo
- [x] 2.3 Em `authMiddleware.js`, adicionar `tenant_id` ao SELECT do banco e expor em `req.user.tenant_id` — verificar que rotas protegidas recebem `req.user.tenant_id` não nulo

## 3. Controller de usuários

- [x] 3.1 Em `userController.js`, filtrar `listUsers` com `WHERE tenant_id = $1` usando `req.user.tenant_id` — verificar que admin só vê usuários do seu tenant
- [x] 3.2 Em `userController.js`, inserir `tenant_id = req.user.tenant_id` no `createUser` — verificar que usuário criado herda o tenant do admin

## 4. Controller de produtos

- [x] 4.1 Em `productController.js`, filtrar `listProducts` com `WHERE tenant_id = $1` — verificar que cada tenant vê apenas seus produtos
- [x] 4.2 Em `productController.js`, inserir `tenant_id = req.user.tenant_id` em `createProduct` — verificar que produto criado pertence ao tenant correto
- [x] 4.3 Em `productController.js`, adicionar `AND tenant_id = $N` nas queries de `updateProduct`, `deleteProduct` e `withdrawProduct` para impedir acesso cross-tenant — verificar que operação em produto de outro tenant retorna 404

## 5. Serviço de movimentações

- [x] 5.1 Em `movementService.js`, adicionar `tenant_id` como parâmetro de `logMovement` e incluí-lo no INSERT — verificar que movimento criado tem `tenant_id` correto
- [x] 5.2 Em todos os callers de `logMovement` (`productController.js`), passar `tenant_id: req.user.tenant_id` — verificar que nenhum caller omite o campo

## 6. Controller de movimentações e relatórios

- [x] 6.1 Em `movementController.js`, filtrar `listMovements` e `listMovementUsers` com `tenant_id = $N` — verificar que cada tenant vê apenas suas movimentações
- [x] 6.2 Em `reportController.js`, adicionar `WHERE tenant_id = $N` em todas as queries de `products` e `movements` — verificar que relatório reflete apenas dados do tenant autenticado

## Workflow follow-up

- Arquivar a mudança após verificação completa.
