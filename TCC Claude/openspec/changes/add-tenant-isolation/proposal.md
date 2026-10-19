# Proposal

## Why

Contas criadas pelo formulário público de cadastro compartilham os mesmos dados (produtos, movimentações, equipe) com todas as outras contas do sistema. Uma nova empresa não pode ter isolamento — seus usuários, produtos e histórico aparecem para qualquer outro admin. Isso impede o uso do sistema por múltiplas empresas independentes.

## What Changes

- Adicionada coluna `tenant_id` nas tabelas `usuarios`, `products` e `movements`
- Cadastro público cria um tenant isolado: `tenant_id = id do próprio usuário`
- Criação de usuário via painel herda `tenant_id` do admin que criou
- JWT e middleware passam a carregar `tenant_id` em `req.user`
- Todos os endpoints filtram dados pelo `tenant_id` do usuário autenticado
- Migration SQL para popular `tenant_id` nos dados existentes

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `auth/register`: Cadastro público DEVE criar um tenant isolado (`tenant_id = id do novo usuário`)
- `auth/backend`: Middleware de autenticação DEVE expor `tenant_id` em `req.user`; todos os endpoints de dados DEVEM filtrar por `tenant_id`

## Impact

- `backend/sql/` — novo arquivo de migration
- `backend/src/models/User.js` — `create` define `tenant_id`
- `backend/src/controllers/authController.js` — login inclui `tenant_id` no JWT
- `backend/src/middleware/auth.js` — carrega `tenant_id` do banco
- `backend/src/controllers/userController.js` — list/create filtram por tenant
- `backend/src/controllers/productController.js` — todas as operações filtram por tenant
- `backend/src/controllers/movementController.js` — list filtra por tenant
- `backend/src/controllers/reportController.js` — filtra por tenant
- `backend/src/services/movementService.js` — `logMovement` recebe `tenant_id`
