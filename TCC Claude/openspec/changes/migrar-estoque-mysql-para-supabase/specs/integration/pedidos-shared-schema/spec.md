# Spec Delta

## Purpose

Define como o StockFlow exibe e trata movimentações originadas do sistema TCC PEDIDOS, aproveitando as colunas `origem` e `pedido_id` já presentes na tabela `movements`.

## ADDED Requirements

### Requirement: Backend retorna origem e pedido_id nas movimentações

A rota `GET /api/movements` DEVE incluir as colunas `origem` e `pedido_id` em cada objeto retornado. `user_id` pode ser `null` (movimentações vindas do sistema de pedidos); a rota NÃO DEVE omitir nem transformar esse campo.

#### Scenario: Listagem inclui colunas de integração

- **WHEN** `GET /api/movements` é chamado
- **THEN** cada objeto da resposta contém `origem`, `pedido_id` e `user_id` (podendo ser null)

### Requirement: Frontend exibe origem da movimentação sem quebrar

A tela de Movimentações DEVE exibir a coluna `origem`. Quando `origem === 'pedido'`, o campo de usuário DEVE mostrar "Sistema de Pedidos". O frontend NÃO DEVE lançar erro quando `user_id` é `null`.

#### Scenario: Movimentação de pedido exibe usuário correto

- **WHEN** o frontend renderiza uma linha com `origem = 'pedido'` e `user_id = null`
- **THEN** exibe "Sistema de Pedidos" no campo de usuário sem erro de renderização

#### Scenario: Movimentação de estoque exibe usuário normal

- **WHEN** o frontend renderiza uma linha com `origem = 'estoque'`
- **THEN** exibe o nome do usuário registrado em `user_nome`

### Requirement: movementService registra origem e pedido_id

A função `logMovement` DEVE aceitar os parâmetros opcionais `origem` (default `'estoque'`) e `pedido_id` (default `null`) e incluí-los no INSERT.

#### Scenario: Movimentação manual sem origem explícita

- **WHEN** `logMovement` é chamado sem `origem`
- **THEN** a linha gravada em `movements` tem `origem = 'estoque'` e `pedido_id = NULL`
