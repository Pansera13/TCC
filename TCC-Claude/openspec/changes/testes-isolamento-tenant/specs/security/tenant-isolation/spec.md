# Spec Delta

## Purpose

Verificação automatizada de que nenhum endpoint autenticado do StockFlow — operações de escrita em produto, leitura de relatórios, lista de usuários de movimentações e gerenciamento de notificações — expõe dados ou aceita comandos de um tenant não autorizado.

## ADDED Requirements

### Requirement: Operações de escrita em produto do tenant B bloqueadas para tenant A

O sistema SHALL recusar DELETE, POST entry, POST withdraw, POST archive e POST restore em um produto quando o `tenant_id` do produto não coincide com o `tenant_id` do JWT, retornando 403 ou 404.

#### Scenario: DELETE produto de outro tenant

- **GIVEN** que tenant A possui um JWT válido
- **WHEN** tenant A envia `DELETE /api/products/{id}` onde `{id}` pertence a tenant B
- **THEN** a resposta tem status 403, 404 ou 405

#### Scenario: Entrada de estoque em produto de outro tenant

- **GIVEN** que tenant A possui um JWT válido
- **WHEN** tenant A envia `POST /api/products/{id}/entry` onde `{id}` pertence a tenant B
- **THEN** a resposta tem status 403 ou 404

#### Scenario: Retirada de estoque de produto de outro tenant

- **GIVEN** que tenant A possui um JWT válido
- **WHEN** tenant A envia `POST /api/products/{id}/withdraw` onde `{id}` pertence a tenant B
- **THEN** a resposta tem status 403 ou 404

#### Scenario: Arquivar produto de outro tenant

- **GIVEN** que tenant A possui um JWT válido
- **WHEN** tenant A envia `POST /api/products/{id}/archive` onde `{id}` pertence a tenant B
- **THEN** a resposta tem status 403 ou 404

#### Scenario: Restaurar produto arquivado de outro tenant

- **GIVEN** que tenant A possui um JWT válido
- **WHEN** tenant A envia `POST /api/products/{id}/restore` onde `{id}` pertence a tenant B e está arquivado
- **THEN** a resposta tem status 403 ou 404

### Requirement: Dados de relatório isolados por tenant

O sistema SHALL garantir que `GET /api/reports` retorna apenas dados (movimentações, produtos) do tenant identificado pelo JWT, sem vazar totais ou contagens de outros tenants.

#### Scenario: Movimentações de tenant B não aparecem no relatório de tenant A

- **GIVEN** que tenant B possui movimentações registradas no período consultado
- **WHEN** tenant A consulta `GET /api/reports` com um intervalo de datas que inclui essas movimentações
- **THEN** os totais de entradas e saídas da resposta refletem apenas os dados de tenant A

### Requirement: Lista de usuários de movimentações isolada por tenant

O sistema SHALL garantir que `GET /api/movements/users` retorna apenas nomes de usuários que realizaram movimentações no tenant do JWT.

#### Scenario: Usuários de tenant B não aparecem na lista de tenant A

- **GIVEN** que tenant B possui movimentações com nomes de usuários distintos
- **WHEN** tenant A consulta `GET /api/movements/users`
- **THEN** nenhum nome de usuário de movimentações de tenant B consta na lista retornada

### Requirement: Notificação de outro usuário não dispensável via ID direto

O sistema SHALL recusar a requisição de dispensar uma notificação quando o `usuario_id` da notificação não coincide com o `id` do JWT, retornando 404.

#### Scenario: Dispensar notificação de outro usuário retorna 404

- **GIVEN** que existe uma notificação com `usuario_id` pertencente ao usuário de tenant B
- **WHEN** o usuário de tenant A envia `POST /api/notificacoes/{id}/dispensar` usando o `id` dessa notificação
- **THEN** a resposta tem status 404 e a notificação permanece não dispensada
