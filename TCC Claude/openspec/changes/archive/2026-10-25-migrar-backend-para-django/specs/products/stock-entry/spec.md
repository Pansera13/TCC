# Spec Delta

## MODIFIED Requirements

### Requirement: Entrada em produto existente
O sistema SHALL permitir que qualquer cargo registre a entrada de uma quantidade positiva em um produto já existente e ativo, somando-a ao estoque e gravando a movimentação do tipo entrada com o usuário e a origem de estoque. A operação SHALL ser executada dentro de uma transação atômica com bloqueio de linha (`SELECT … FOR UPDATE`), de modo que a leitura do estado do produto (ativo/arquivado), a atualização do saldo e o registro da movimentação ocorram atomicamente.

#### Scenario: Funcionário registra entrada

- **WHEN** um Funcionário informa uma quantidade positiva de entrada para um produto
- **THEN** o estoque do produto aumenta nessa quantidade e uma movimentação de entrada aparece no histórico com o nome do Funcionário

#### Scenario: Quantidade inválida

- **WHEN** a quantidade informada é zero, negativa ou não numérica
- **THEN** o servidor responde 400 e o estoque não muda

#### Scenario: Produto arquivado

- **WHEN** a entrada é pedida para um produto arquivado
- **THEN** o servidor recusa e o estoque não muda

#### Scenario: Entradas simultâneas acumuladas corretamente

- **WHEN** duas entradas chegam simultaneamente para o mesmo produto
- **THEN** o saldo final reflete a soma das duas quantidades, sem perda de nenhuma delas
