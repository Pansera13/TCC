# Spec Delta

## MODIFIED Requirements

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
