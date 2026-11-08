# Spec Delta

## Purpose

Popula o estoque com 20 produtos de alimentos e bebidas de forma idempotente e atômica, gerando movimentações de entrada consistentes com o saldo inicial de cada produto.

## ADDED Requirements

### Requirement: Inserção idempotente de produtos
O script SHALL verificar, antes de cada inserção, se já existe um produto com o mesmo nome (comparação case-insensitive). Se existir, SHALL pular o produto sem alterar seu saldo ou criar nova movimentação.

#### Scenario: Produto ainda não existe
- **WHEN** o script é executado e nenhum produto da lista existe no banco
- **THEN** os 20 produtos são inseridos em `products` com seus atributos (nome, quantidade, unidade, peso_kg, categoria, fornecedor)

#### Scenario: Segunda execução
- **WHEN** o script é executado novamente após todos os produtos já existirem
- **THEN** 0 produtos são inseridos e 20 são reportados como ignorados, sem alterar quantidades ou criar movimentações duplicadas

#### Scenario: Execução parcial
- **WHEN** parte dos produtos já existe no banco
- **THEN** somente os produtos ausentes são inseridos; os existentes são ignorados sem modificação

### Requirement: Movimentação de entrada por produto inserido
Para cada produto efetivamente inserido, o sistema SHALL registrar uma linha em `movements` com `tipo='entrada'`, `origem='estoque'`, `quantidade` igual à inicial do produto, `user_id=NULL` e `user_nome='Seed'`.

#### Scenario: Consistência de saldo
- **WHEN** um produto é inserido pelo seed
- **THEN** existe exatamente uma movimentação de entrada com `quantidade` igual a `products.quantidade` para aquele produto, e o `SUM` das entradas daquele produto em `movements` bate com `products.quantidade`

#### Scenario: Produto ignorado não gera movimentação
- **WHEN** o produto já existe e é ignorado
- **THEN** nenhuma movimentação adicional é criada para ele

### Requirement: Atomicidade
Todas as inserções de produtos e movimentações SHALL ocorrer dentro de uma única transação. Se qualquer inserção falhar, nenhuma alteração é persistida.

#### Scenario: Falha durante a inserção
- **WHEN** ocorre um erro em qualquer ponto do script (ex.: violação de constraint, falha de rede)
- **THEN** a transação é revertida e o banco permanece no estado anterior à execução

### Requirement: Resumo de execução
Ao concluir, o script SHALL imprimir: número de produtos inseridos, número ignorados e contagem de produtos por categoria. Não SHALL imprimir a `DATABASE_URL` nem outros segredos.

#### Scenario: Execução bem-sucedida
- **WHEN** o script termina sem erro
- **THEN** a saída inclui "X inseridos, Y ignorados" e uma lista com contagem por categoria

#### Scenario: Falha de conexão
- **WHEN** o banco não está acessível
- **THEN** o script imprime a mensagem de erro e encerra com código de saída não-zero
