# Spec Delta

## Purpose

Define a integração do sistema de pedidos com a API REST do sistema de estoque para consulta de produtos disponíveis e execução automática de baixa de estoque quando um pedido é marcado como pago.

## ADDED Requirements

### Requirement: Consulta de produtos do estoque
O sistema SHALL consultar a lista de produtos disponíveis via API REST do sistema de estoque para exibição durante a montagem de um pedido.

#### Scenario: Produtos retornados com sucesso
- **WHEN** o frontend solicita a lista de produtos para montagem de pedido
- **THEN** o backend consulta `GET /products` na API do sistema de estoque e retorna os produtos com nome, quantidade disponível e unidade

#### Scenario: Estoque indisponível
- **WHEN** a API do sistema de estoque não responde dentro do timeout configurado
- **THEN** o sistema retorna erro indicando que o serviço de estoque está indisponível, sem interromper outras operações do sistema de pedidos

### Requirement: Baixa automática de estoque ao pagar
O sistema SHALL, ao marcar um pedido como `pago`, chamar a API REST do sistema de estoque para executar a saída de cada item do pedido.

#### Scenario: Baixa realizada com sucesso para todos os itens
- **WHEN** todos os itens do pedido têm estoque suficiente e a chamada à API do estoque é bem-sucedida
- **THEN** cada item é baixado do estoque e o pedido permanece com status `pago`

#### Scenario: Estoque insuficiente em algum item
- **WHEN** a API do sistema de estoque rejeita a baixa de um item por estoque insuficiente
- **THEN** o sistema registra o erro de baixa no pedido e mantém o status `pago`, sem reverter os demais itens já baixados com sucesso

#### Scenario: API do estoque indisponível ao pagar
- **WHEN** a API do sistema de estoque não está acessível no momento do pagamento
- **THEN** o pedido é marcado como `pago` e o erro de comunicação é registrado para reprocessamento manual

### Requirement: Autenticação com a API do estoque
O sistema SHALL autenticar as requisições à API do sistema de estoque usando um token de serviço configurado por variável de ambiente.

#### Scenario: Token de serviço enviado nas requisições
- **WHEN** o sistema realiza qualquer chamada à API do estoque
- **THEN** o header `Authorization: Bearer <SERVICE_TOKEN>` é incluído na requisição

#### Scenario: Token não configurado impede inicialização
- **WHEN** a variável de ambiente do token de serviço não está definida ao iniciar o servidor
- **THEN** o servidor registra um aviso e as chamadas ao estoque retornam erro de configuração
