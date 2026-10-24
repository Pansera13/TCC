# Tasks

Verificação: o projeto não tem executor de testes; use `npm run build`/`npm run lint` no frontend, scripts `node`/`curl` contra a API (um token por cargo, com contas de teste removidas ao final) e conferência no navegador (claro, escuro e 360 px).

## 1. SQL e backend

- [x] 1.1 **Pausa de aprovação do banco.** Criar `backend/sql/migracao_arquivar_produtos.sql` e `backend/sql/reverter_arquivar_produtos.sql` com o SQL B do `design.md`, **sem executá-los**. Pedir que o usuário revise e aplique manualmente no Supabase e confirme. Verificar com a consulta de conferência (colunas `arquivado` e `arquivado_em` existem, 0 arquivados); sem a confirmação, não seguir para as tarefas 1.4 em diante.
- [x] 1.2 Criar `backend/src/utils/permissoes.js` (níveis, mapa permissão → nível mínimo, `can`, `podeAlterarConta`, `podeCriarCargo`) e remover `backend/src/utils/roles.js`. Verificar com um script `node`: Funcionário não tem `produto:arquivar`; Sócio tem e não tem `produto:excluir`; Administrador tem todas; `podeAlterarConta('socio','user')` é verdadeiro e com alvo `socio` ou `admin` é falso.
- [x] 1.3 Criar `exigePermissao(permissao)` em `backend/src/middleware/` (403 "Você não tem permissão para esta ação."), remover `middleware/admin.js` e aplicar a matriz da D2 em `routes/users.js`, `products.js`, `nfe.js`, `reports.js` e `movements.js`. Verificar com `curl` que cada rota responde 403 para o cargo sem permissão e 200 para quem tem.
- [x] 1.4 Reescrever as regras de `userController`: criação (Sócio só `user`), `PUT /:id/status` (Sócio só sobre `user`), `PUT /:id/role` e `DELETE /:id` só Administrador, ninguém altera o próprio cargo nem se exclui; recusa com 403 e mensagem clara. Verificar com `curl` os cenários das specs `team-management` e `roles-permissions` e que nada é alterado nos casos de 403.
- [x] 1.5 `POST /api/auth/login` e `GET /api/profile` passam a devolver `permissoes` (lista de chaves do cargo atual). Verificar com `curl` para os três cargos.
- [x] 1.6 `productController`: `listProducts` sem arquivados e com `?arquivados=1` (Administrador); rotas `POST /:id/archive`, `POST /:id/restore` e `POST /:id/entry`; `withdraw`, `update` e `entry` recusam produto arquivado com 409; `archive`/`restore` gravam `logMovement` tipo `edicao` com `detalhes {antes, depois}`. Verificar com `curl`: arquivar some de `GET /products`, aparece em `?arquivados=1` só para Administrador, restaurar devolve, retirada de arquivado dá 409, entrada soma e grava movimentação.
- [x] 1.7 `reportController` e `movementController`: relatórios ignoram produtos arquivados nos totais, top, giro e consumo; Funcionário só recebe as próprias movimentações. Verificar com um produto arquivado de teste (totais mudam e voltam ao restaurar) e com `curl` como Funcionário (só linhas dele).

## 2. Frontend

- [x] 2.1 `AuthContext` guarda `permissoes` (do login e do `GET /api/profile`, que também corrige sessão antiga) e expõe `can(permissao)`; `utils/roles.js` fica só com rótulos (Funcionário, Sócio, Administrador) e cores. Trocar `isAdmin` e `adminOnly` por `can(...)` no `Dashboard.jsx`, `TopNav.jsx` e demais componentes. Verificar com `grep` que não sobra comparação direta de `role === 'admin'` nem o texto "Operador", e com `npm run build` e `npm run lint`.
- [x] 2.2 `AddUserModal` oferece só os cargos que o usuário pode criar (Sócio: Funcionário; Administrador: os três). Verificar no navegador como Sócio e como Administrador.
- [x] 2.3 Aba Equipe: visível para Sócio e Administrador; controles por linha conforme a permissão (Sócio só ativar/desativar Funcionário; Administrador cargo, status e exclusão); célula "—" onde não há permissão; selos com os rótulos novos. Verificar no navegador com contas de cada cargo.
- [x] 2.4 Botões de produto por cargo: Entrada e Retirar para todos (novo modal de Entrada em Lista, Acordeão, Grade e Compacto); cadastrar, editar e importar NF-e só do Sócio em diante; "Arquivar produto" no `EditProductModal` para Sócio e Administrador com confirmação em duas etapas, e exclusão definitiva só para o Administrador. Verificar no navegador por cargo.
- [x] 2.5 Realtime e visão **Arquivados** (somente Administrador): o handler de UPDATE remove o produto quando `arquivado` vira `true` e o reinsere ao restaurar; nova visão com lista, Restaurar e Excluir definitivamente (mensagem do 409). Movimentações ganha o rótulo do campo `arquivado` e continua mostrando o nome do produto arquivado. Verificar com duas sessões: arquivar numa e ver sumir na outra sem recarregar.
- [x] 2.6 Funcionário em Movimentações (apenas as próprias) e em Relatórios (aba oculta). Verificar no navegador como Funcionário.

## 3. Verificação

- [x] 3.1 Script de API contra os três cargos (contas de teste criadas e removidas ao final) cobrindo cada linha da matriz: tudo que o cargo pode retorna 2xx e tudo proibido retorna 403, em especial Funcionário e Sócio nas ações exclusivas do Administrador (excluir/restaurar produto, excluir usuário, mudar cargo, criar Sócio/Administrador, alterar contas de Sócio/Administrador). Anotar a tabela de resultados.
- [x] 3.2 Conferência na interface por cargo (Funcionário, Sócio, Administrador): abas, botões e rótulos conforme a matriz, em claro, escuro e 360 px; arquivar, restaurar e excluir definitivamente; Entrada; conta desativada perde o acesso.
- [x] 3.3 Regressão: Início, Sem estoque, Relatórios (totais sem arquivados), Realtime, paginação e ordenação das tabelas, `npm run build` e `npm run lint` sem erros novos, e conta original continua entrando como Administrador.
