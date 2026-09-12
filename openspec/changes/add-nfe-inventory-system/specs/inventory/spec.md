## Purpose

Manter o catálogo de produtos e os saldos de estoque de cada conta, correspondendo automaticamente os itens importados aos produtos existentes (ou criando novos), registrando movimentações e permitindo ajustes manuais quando necessário.

## ADDED Requirements

### Requirement: Correspondência e criação automática de produtos
O sistema SHALL, ao processar os itens de uma nota, localizar um produto existente equivalente (preferencialmente por GTIN e, na ausência dele, por descrição normalizada) e, quando não houver equivalente, criar automaticamente um novo produto no catálogo da conta.

#### Scenario: Item corresponde a produto existente
- **WHEN** um item importado possui GTIN igual ao de um produto já cadastrado na conta
- **THEN** o sistema associa o item a esse produto e incrementa o saldo, sem criar duplicata

#### Scenario: Item sem produto correspondente
- **WHEN** um item importado não corresponde a nenhum produto existente da conta
- **THEN** o sistema cria automaticamente um novo produto com os dados da nota e registra a entrada nesse novo produto

### Requirement: Saldo de estoque por produto
O sistema SHALL manter, para cada produto da conta, um saldo atual que reflete a soma das entradas menos as saídas e ajustes, nunca produzindo saldo negativo por uma saída maior que o disponível.

#### Scenario: Consulta de saldo
- **WHEN** o usuário consulta o catálogo
- **THEN** o sistema exibe cada produto com seu saldo atual e unidade de medida

#### Scenario: Saída maior que o saldo
- **WHEN** o usuário tenta registrar uma saída de quantidade maior que o saldo disponível de um produto
- **THEN** o sistema rejeita a operação e informa o saldo disponível, mantendo o saldo inalterado

### Requirement: Registro de movimentações
O sistema SHALL registrar cada alteração de saldo como uma movimentação com tipo (entrada, saída ou ajuste), quantidade, data/hora e origem (nota importada ou ação manual), formando um histórico consultável por produto.

#### Scenario: Histórico do produto
- **WHEN** o usuário abre o histórico de um produto
- **THEN** o sistema lista as movimentações em ordem cronológica com tipo, quantidade e origem

### Requirement: Ajuste manual de estoque e edição de produto
O sistema SHALL permitir que o usuário ajuste manualmente o saldo de um produto e edite seus dados cadastrais (descrição, unidade, GTIN), registrando o ajuste como movimentação.

#### Scenario: Ajuste manual de saldo
- **WHEN** o usuário informa um novo saldo ou uma correção para um produto
- **THEN** o sistema atualiza o saldo e registra uma movimentação do tipo ajuste com a diferença aplicada

#### Scenario: Edição de dados do produto
- **WHEN** o usuário edita a descrição, a unidade ou o GTIN de um produto
- **THEN** o sistema salva os novos dados e passa a usá-los na correspondência automática de futuras importações
