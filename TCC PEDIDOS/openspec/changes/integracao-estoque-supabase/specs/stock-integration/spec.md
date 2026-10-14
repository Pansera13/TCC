# Spec Delta

## MODIFIED Requirements

### Requirement: Consulta de produtos do estoque
O sistema SHALL consultar a lista de produtos disponíveis diretamente da tabela `products` no Supabase compartilhado, filtrando apenas produtos com quantidade maior que zero, para exibição durante a montagem de um pedido.

#### Scenario: Produtos retornados com sucesso
- **WHEN** o frontend solicita a lista de produtos para montagem de pedido
- **THEN** o backend consulta `products` no Supabase e retorna os produtos com nome, quantidade disponível, unidade e categoria

#### Scenario: Supabase indisponível
- **WHEN** o Supabase não responde dentro do timeout configurado
- **THEN** o sistema retorna erro indicando que o serviço está indisponível, sem interromper outras operações do sistema de pedidos

### Requirement: Baixa automática de estoque ao pagar
O sistema SHALL, ao marcar um pedido como `pago`, executar a função SQL `pagar_pedido` no Supabase de forma atômica: todos os itens são baixados ou nenhum. Se qualquer item não tiver estoque suficiente, o pedido permanece `confirmado` e a API retorna HTTP 409.

#### Scenario: Baixa realizada com sucesso para todos os itens
- **WHEN** todos os itens do pedido têm estoque suficiente
- **THEN** a função `pagar_pedido` decrementa `products.quantidade` de cada item, registra movimentação com `origem='pedido'` e `pedido_id` em `movements`, marca o pedido como `pago` e retorna 200

#### Scenario: Estoque insuficiente em algum item
- **WHEN** qualquer item do pedido não possui quantidade suficiente em `products`
- **THEN** nenhuma quantidade é alterada, o pedido permanece `confirmado`, e a API retorna HTTP 409 com a lista de itens problemáticos e seus estoques disponíveis

#### Scenario: Dois pagamentos simultâneos do mesmo pedido
- **WHEN** dois pagamentos concorrentes são disparados para o mesmo pedido
- **THEN** apenas um efetua a baixa de estoque; o outro retorna HTTP 400 (status_invalido) porque o pedido já foi pago na primeira transação

## REMOVED Requirements

### Requirement: Autenticação com a API do estoque
**Reason**: O mecanismo de integração mudou de HTTP REST para Supabase RPC. Não há mais chamadas HTTP ao backend do TCC Claude; o acesso ao banco é feito via client service_role do Supabase, que não requer token de serviço separado.
**Migration**: Remover `ESTOQUE_API_URL` e `ESTOQUE_SERVICE_TOKEN` das variáveis de ambiente. O client Supabase com `SUPABASE_SERVICE_KEY` substitui toda a autenticação de serviço.
