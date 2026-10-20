# Spec: products/stock-entry

## Purpose

Permite registrar a entrada de quantidade em um produto já cadastrado, gerando a movimentação correspondente.

## Requirements

### Requirement: Entrada em produto existente
O sistema SHALL permitir que qualquer cargo registre a entrada de uma quantidade positiva em um produto já existente e ativo, somando-a ao estoque e gravando a movimentação do tipo entrada com o usuário e a origem de estoque.

#### Scenario: Funcionário registra entrada
- **WHEN** um Funcionário informa uma quantidade positiva de entrada para um produto
- **THEN** o estoque do produto aumenta nessa quantidade e uma movimentação de entrada aparece no histórico com o nome do Funcionário

#### Scenario: Quantidade inválida
- **WHEN** a quantidade informada é zero, negativa ou não numérica
- **THEN** o servidor responde 400 e o estoque não muda

#### Scenario: Produto arquivado
- **WHEN** a entrada é pedida para um produto arquivado
- **THEN** o servidor recusa e o estoque não muda

### Requirement: Botão Entrada na interface
As listas de produtos SHALL oferecer a ação Entrada ao lado de Retirar para todos os cargos, em todos os layouts.

#### Scenario: Registrar entrada pela tela
- **WHEN** o usuário aciona Entrada em um produto e confirma a quantidade
- **THEN** a quantidade exibida é atualizada e a entrada aparece em Movimentações
