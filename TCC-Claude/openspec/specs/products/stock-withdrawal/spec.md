# Spec: products/stock-withdrawal

## Purpose

Controla as saídas de estoque, permitindo que o usuário retire uma quantidade de um produto existente com validação de que o saldo disponível não será ultrapassado.

## Requirements

### Requirement: Botão de retirada na lista de produtos
O sistema SHALL exibir um botão "Retirar" em cada linha da tabela de produtos do Dashboard, habilitado apenas quando o produto tiver quantidade maior que zero.

#### Scenario: Botão visível para produto com estoque
- **WHEN** a tabela de produtos é exibida e um produto tem quantidade > 0
- **THEN** o botão "Retirar" aparece na linha desse produto

#### Scenario: Botão desabilitado para produto sem estoque
- **WHEN** a tabela de produtos é exibida e um produto tem quantidade igual a zero
- **THEN** o botão "Retirar" está desabilitado (não clicável) na linha desse produto

### Requirement: Modal de retirada de estoque
O sistema SHALL exibir um modal ao clicar em "Retirar", mostrando o nome do produto, o estoque atual disponível e um campo para informar a quantidade a retirar.

#### Scenario: Abertura do modal
- **WHEN** o usuário clica em "Retirar" em um produto
- **THEN** o sistema abre um modal com o nome do produto, o estoque disponível e o campo de quantidade

### Requirement: Validação da quantidade de retirada
O sistema SHALL impedir a retirada quando a quantidade informada for inválida ou superior ao estoque disponível. A verificação do saldo disponível SHALL ocorrer dentro de uma transação atômica com bloqueio de linha (`SELECT … FOR UPDATE`), de modo que o saldo lido e o saldo debitado sejam sempre consistentes mesmo sob requisições concorrentes.

#### Scenario: Quantidade maior que o estoque

- **WHEN** o usuário informa uma quantidade maior que o estoque atual e clica em "Confirmar"
- **THEN** o sistema exibe mensagem de erro informando o saldo disponível e não realiza a retirada

#### Scenario: Quantidade zero ou negativa

- **WHEN** o usuário informa quantidade menor ou igual a zero
- **THEN** o sistema exibe erro no campo e impede a confirmação

#### Scenario: Quantidade exata disponível

- **WHEN** o usuário informa exatamente o valor do estoque atual
- **THEN** o sistema aceita e zera o estoque do produto

#### Scenario: Retiradas concorrentes não deixam saldo negativo

- **WHEN** duas retiradas chegam simultaneamente para o mesmo produto com estoque suficiente apenas para uma delas
- **THEN** exatamente uma é aceita e a outra recebe HTTP 400 com "Estoque insuficiente"; o saldo final nunca fica abaixo de zero

### Requirement: Confirmação da retirada
O sistema SHALL atualizar o estoque do produto subtraindo a quantidade retirada após confirmação do usuário, e SHALL fechar o modal em seguida.

#### Scenario: Retirada bem-sucedida
- **WHEN** o usuário informa uma quantidade válida e clica em "Confirmar"
- **THEN** o sistema subtrai a quantidade do estoque, atualiza a tabela no Dashboard e fecha o modal

#### Scenario: Cancelamento da retirada
- **WHEN** o usuário clica em "Cancelar" ou fecha o modal
- **THEN** o estoque permanece inalterado
