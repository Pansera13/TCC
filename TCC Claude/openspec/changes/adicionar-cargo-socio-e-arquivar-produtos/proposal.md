# Proposal

## Why

O StockFlow só tem dois níveis de acesso (administrador e operador), então não há como dar a alguém de confiança a operação completa do estoque sem entregar também as ações irreversíveis e as que afetam acesso e segurança (excluir produto e usuário, mudar cargos). Além disso, "excluir produto" apaga o item do estoque ativo de forma definitiva; um meio-termo reversível (arquivar) protege o histórico e evita erros.

## What Changes

- **Três cargos com herança**: Funcionário (`user`, mantido para não quebrar contas existentes) < Sócio (`socio`) < Administrador (`admin`, dono da empresa). Rótulos na tela: Funcionário, Sócio, Administrador (o rótulo "Operador" deixa de existir).
- **Matriz de permissões** com fonte única no backend: cada rota exige um nível/permissão por middleware, e o frontend só lê do servidor o que o usuário pode fazer para mostrar ou esconder botões (esconder é complemento; a imposição é do servidor).
  - Funcionário: ver Início, Produtos, Sem estoque e Movimentações; registrar entrada e retirada.
  - Sócio: tudo do Funcionário + cadastrar e editar produtos, arquivar produtos, importar NF-e, ver Relatórios e histórico completo, ver a aba Equipe, criar contas de Funcionário e ativar/desativar Funcionários.
  - Administrador: tudo do Sócio + restaurar produtos arquivados, excluir produtos definitivamente, excluir usuários, criar Sócio/Admin, mudar cargos e gerenciar contas de Sócio e Admin.
- **Ações exclusivas do Administrador**: exclusão definitiva de produto, restaurar arquivado, exclusão de usuário, mudança de cargo, criação de Sócio/Admin e qualquer alteração em contas de Sócio ou Admin. Ninguém altera o próprio cargo.
- **Arquivar produto** (substitui "excluir" para o Sócio): o produto sai das listas, da busca, do Início, de Sem estoque e dos Relatórios, mas permanece no banco com todo o histórico de movimentações (que continua mostrando o nome). O Administrador ganha a visão **Arquivados** para restaurar ou excluir definitivamente.
- **Nova ação Entrada**: somar quantidade a um produto já existente (hoje a entrada só é gravada ao cadastrar produto novo), liberada a todos os cargos e registrada em Movimentações.
- **Reconciliação com o que já está no código**: um modelo anterior, mais simples (Sócio com as mesmas funções do Administrador, sem poder agir sobre cargos superiores, `backend/src/utils/roles.js` e `frontend/src/utils/roles.js` com comparação de nível) foi implementado e a restrição `usuarios_role_check` já aceita `socio` no Supabase. Esta change o **substitui** pela matriz acima: o Sócio passa a gerenciar só Funcionários, não muda cargos e não exclui usuários.
- **BREAKING (interno)**: `GET /api/products` deixa de devolver arquivados; `DELETE /api/products/:id` e `DELETE /api/users/:id` passam a ser só do Administrador; `PUT /api/users/:id/role` passa a ser só do Administrador; `/api/users` e o resto da gestão deixam de ser "gestor = admin ou sócio".
- **Banco de dados (SQL à parte, aplicado manualmente por você)**: duas colunas novas em `products`. O SQL completo, o estado atual da restrição de cargo e as reversões estão no `design.md`. Nada é aplicado pela implementação sem a sua revisão.

## Capabilities

### New Capabilities
- `auth/roles-permissions`: os três cargos, a matriz de permissões, a fonte única de níveis e a imposição por middleware no backend (com 403 nas ações proibidas).
- `team/team-management`: aba Equipe, criação de contas, troca de cargo, ativar/desativar e excluir usuários, conforme o cargo de quem age.
- `products/product-archiving`: arquivar, restaurar, visão Arquivados e exclusão definitiva, com efeitos em listas, relatórios, Realtime e histórico.
- `products/stock-entry`: ação Entrada em produto existente, para todos os cargos.

### Modified Capabilities
- `auth/backend`: o requisito "Middleware de autenticação JWT" passa a validar a conta no banco a cada requisição (conta desativada ou removida perde o acesso) e a distinguir 401 (sessão) de 403 (sem permissão para a ação).

## Impact

- **Banco (Supabase, compartilhado com o sistema de Pedidos)**: `products` ganha `arquivado` e `arquivado_em`. O sistema de Pedidos não conhece essas colunas e continuará listando produtos arquivados a menos que passe a filtrá-las.
- **Backend**: `middleware/admin.js` (substituído por middleware de nível/permissão), `utils/roles.js` (vira a matriz única), `routes/users.js`, `routes/products.js`, `routes/nfe.js`, `routes/movements.js`, `routes/reports.js`, `routes/profile.js` (devolve permissões), `controllers/userController.js`, `productController.js` (arquivar, restaurar, entrada, filtro de arquivados), `movementController.js` (Funcionário só vê as próprias), `reportController.js`.
- **Frontend**: `pages/Dashboard.jsx` (`isAdmin`, abas, botões, visão Arquivados, Realtime), `components/AddUserModal.jsx`, `EditProductModal.jsx`, `TopNav.jsx`, `AddProductModal.jsx`, `MovementsHistory.jsx`, `context/AuthContext.jsx`, `utils/roles.js`, `services/api.js`.
- Sem novas dependências. Contas existentes continuam funcionando sem migração de dados.
