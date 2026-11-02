# Spec Delta

## Purpose

Garante que operações de entrada e retirada de estoque sejam executadas dentro de transações atômicas com bloqueio de linha (SELECT FOR UPDATE), eliminando a possibilidade de saldo negativo ou dupla contagem sob requisições concorrentes.

## ADDED Requirements

### Requirement: Atomicidade nas operações de estoque

Toda operação de entrada ou retirada de estoque SHALL ser executada dentro de uma única transação de banco de dados com bloqueio de linha (`SELECT … FOR UPDATE`) no produto afetado, de modo que a leitura do saldo atual, a validação e a atualização ocorram atomicamente sem que outra requisição concorrente altere o mesmo produto entre essas etapas.

#### Scenario: Retiradas concorrentes não deixam saldo negativo

- **WHEN** duas requisições de retirada chegam simultaneamente para o mesmo produto com estoque suficiente apenas para uma delas
- **THEN** exatamente uma retirada é aceita e a outra recebe HTTP 400 com "Estoque insuficiente"; o saldo final nunca fica abaixo de zero

#### Scenario: Transação revertida em caso de erro

- **WHEN** a gravação da movimentação falha após atualizar o estoque dentro da mesma transação
- **THEN** a atualização do estoque é revertida (rollback) e o saldo permanece inalterado

#### Scenario: Entrada e retirada simultâneas no mesmo produto

- **WHEN** uma entrada e uma retirada chegam simultaneamente para o mesmo produto
- **THEN** ambas são processadas sequencialmente sem perda de dados: o saldo final reflete exatamente os dois movimentos

### Requirement: Movimentação registrada na mesma transação

O registro da movimentação em `movements` SHALL ocorrer dentro da mesma transação que altera `products.quantidade`, garantindo que nunca exista uma alteração de estoque sem movimentação correspondente ou uma movimentação sem a alteração de estoque.

#### Scenario: Auditoria sempre consistente

- **WHEN** qualquer entrada ou retirada é concluída com sucesso
- **THEN** existe exatamente uma linha em `movements` para essa operação, com `tipo`, `quantidade`, `user_id`, `user_nome` e `tenant_id` corretos; não há registro de estoque sem movimentação associada

#### Scenario: Falha após gravar movements mas antes de confirmar

- **WHEN** a transação é interrompida após inserir a movimentação mas antes do COMMIT
- **THEN** o ROLLBACK desfaz tanto a movimentação quanto a alteração de quantidade; o banco permanece consistente
