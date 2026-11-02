# Spec Delta

## Purpose

Gerencia o ciclo de vida de pedidos no sistema TCC PEDIDOS: criação, composição de itens, atualização de status e consulta de histórico, com persistência no Supabase.

## ADDED Requirements

### Requirement: Criação de pedido
O sistema SHALL permitir que um usuário autenticado crie um novo pedido associado à sua conta. O pedido é criado no estado `rascunho`.

#### Scenario: Pedido criado com sucesso
- **WHEN** o usuário envia uma requisição de criação de pedido autenticada
- **THEN** o sistema cria um pedido no estado `rascunho` e retorna o id do pedido criado

#### Scenario: Criação sem autenticação rejeitada
- **WHEN** a requisição de criação de pedido não contém token de autenticação válido
- **THEN** o sistema retorna erro 401

### Requirement: Adição de itens ao pedido
O sistema SHALL permitir adicionar itens a um pedido no estado `rascunho`, informando id do produto (do sistema de estoque), quantidade e nome do produto.

#### Scenario: Item adicionado com sucesso
- **WHEN** o usuário adiciona um item válido (product_id, nome, quantidade > 0) a um pedido em `rascunho` de sua autoria
- **THEN** o sistema persiste o item vinculado ao pedido e retorna o item criado

#### Scenario: Item com quantidade inválida rejeitado
- **WHEN** o usuário tenta adicionar um item com quantidade zero ou negativa
- **THEN** o sistema retorna erro 400

#### Scenario: Item em pedido fora de rascunho rejeitado
- **WHEN** o usuário tenta adicionar item a um pedido cujo status não é `rascunho`
- **THEN** o sistema retorna erro 400

### Requirement: Remoção de itens do pedido
O sistema SHALL permitir remover um item de um pedido que ainda está em `rascunho`.

#### Scenario: Item removido com sucesso
- **WHEN** o usuário remove um item existente de um pedido em `rascunho` de sua autoria
- **THEN** o sistema exclui o item e retorna confirmação

#### Scenario: Remoção em pedido confirmado ou pago rejeitada
- **WHEN** o usuário tenta remover item de pedido com status diferente de `rascunho`
- **THEN** o sistema retorna erro 400

### Requirement: Confirmação de pedido
O sistema SHALL permitir que o usuário avance um pedido do estado `rascunho` para `confirmado`, desde que o pedido contenha ao menos um item.

#### Scenario: Pedido confirmado com sucesso
- **WHEN** o usuário confirma um pedido em `rascunho` com ao menos um item
- **THEN** o sistema atualiza o status para `confirmado` e retorna o pedido atualizado

#### Scenario: Confirmação de pedido vazio rejeitada
- **WHEN** o usuário tenta confirmar um pedido sem nenhum item
- **THEN** o sistema retorna erro 400

### Requirement: Marcação de pedido como pago
O sistema SHALL permitir que o usuário avance um pedido do estado `confirmado` para `pago`.

#### Scenario: Pedido marcado como pago com sucesso
- **WHEN** o usuário marca como pago um pedido no estado `confirmado`
- **THEN** o sistema atualiza o status para `pago` e dispara a baixa de estoque para cada item do pedido

#### Scenario: Marcação como pago em estado inválido rejeitada
- **WHEN** o usuário tenta marcar como pago um pedido que não está em `confirmado`
- **THEN** o sistema retorna erro 400

### Requirement: Listagem de pedidos do usuário
O sistema SHALL listar todos os pedidos do usuário autenticado, ordenados do mais recente para o mais antigo, incluindo o status e a data de criação de cada pedido.

#### Scenario: Listagem retornada com sucesso
- **WHEN** o usuário autenticado solicita a lista de seus pedidos
- **THEN** o sistema retorna array com todos os pedidos do usuário ordenados por data decrescente

#### Scenario: Listagem vazia para novo usuário
- **WHEN** o usuário autenticado não possui pedidos ainda
- **THEN** o sistema retorna array vazio

### Requirement: Consulta de pedido por id
O sistema SHALL permitir consultar os detalhes completos de um pedido (incluindo seus itens) pelo id, desde que o pedido pertença ao usuário autenticado.

#### Scenario: Pedido encontrado
- **WHEN** o usuário solicita um pedido existente de sua autoria informando o id
- **THEN** o sistema retorna os dados do pedido com a lista de itens

#### Scenario: Pedido de outro usuário negado
- **WHEN** o usuário solicita um pedido existente que não é de sua autoria
- **THEN** o sistema retorna erro 403
