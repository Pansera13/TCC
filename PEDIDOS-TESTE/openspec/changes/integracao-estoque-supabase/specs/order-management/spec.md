# Spec Delta

## MODIFIED Requirements

### Requirement: Marcação de pedido como pago
O sistema SHALL permitir que o usuário avance um pedido do estado `confirmado` para `pago` somente quando todos os itens têm estoque suficiente. Se o estoque for insuficiente em qualquer item, o pedido permanece `confirmado` e a operação é rejeitada com HTTP 409.

#### Scenario: Pedido marcado como pago com sucesso
- **WHEN** o usuário marca como pago um pedido no estado `confirmado` e todos os itens têm estoque disponível
- **THEN** o sistema atualiza o status para `pago`, o estoque de cada item é decrementado atomicamente e a movimentação de saída é registrada

#### Scenario: Marcação como pago em estado inválido rejeitada
- **WHEN** o usuário tenta marcar como pago um pedido que não está em `confirmado`
- **THEN** o sistema retorna erro 400

#### Scenario: Pagamento rejeitado por estoque insuficiente
- **WHEN** o usuário tenta pagar um pedido e um ou mais itens não têm quantidade suficiente em estoque
- **THEN** o sistema retorna HTTP 409 com a lista de itens com erro, o pedido permanece `confirmado` e nenhuma quantidade é alterada no estoque
