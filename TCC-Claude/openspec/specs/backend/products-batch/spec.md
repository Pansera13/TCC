# backend/products-batch Specification

## Purpose

Endpoint em lote para importação de NF-e: recebe todos os itens de uma nota em uma única requisição, cria ou empilha os produtos em uma transação atômica e desfaz tudo se qualquer item falhar.

## Requirements

### Requirement: Endpoint POST /api/products/lote
O sistema SHALL expor `POST /api/products/lote` acessível apenas a usuários com permissão `produto:importar-nfe`.

#### Scenario: Usuário sem permissão
- **WHEN** um usuário sem `produto:importar-nfe` chama `POST /api/products/lote`
- **THEN** o servidor responde HTTP 403 e nenhum produto é criado ou alterado

#### Scenario: Requisição autenticada
- **WHEN** um usuário com `produto:importar-nfe` chama `POST /api/products/lote`
- **THEN** o servidor processa a lista de itens

### Requirement: Processamento transacional
Todos os itens SHALL ser processados em uma única transação. Se qualquer item falhar, a transação SHALL ser revertida e nenhuma alteração persistida.

#### Scenario: Todos os itens válidos
- **WHEN** todos os itens passam na validação e não há erro de banco
- **THEN** todos são criados ou empilhados e a transação é confirmada

#### Scenario: Um item inválido no meio da lista
- **WHEN** um dos itens tem `nome` vazio ou `quantidade` zero
- **THEN** o servidor responde HTTP 400, a transação é revertida e nenhum outro item é salvo

#### Scenario: Erro de banco em um item
- **WHEN** ocorre erro de integridade ao salvar um item
- **THEN** a transação é revertida inteiramente e o servidor responde HTTP 500 com mensagem de erro

### Requirement: Deduplicação por chNFe no lote
O endpoint SHALL verificar, antes de processar, se já existe movimentação do mesmo tenant com `detalhes->>'nfe_chave'` igual ao `nfe_chave` informado. Se sim, SHALL rejeitar com HTTP 409.

#### Scenario: NF-e já importada
- **WHEN** o `nfe_chave` já consta em movimentações do tenant
- **THEN** o servidor responde HTTP 409 "Esta NF-e já foi importada anteriormente." e nenhum item é salvo

#### Scenario: Primeira importação
- **WHEN** o `nfe_chave` não existe em movimentações do tenant
- **THEN** o servidor processa os itens normalmente

### Requirement: Reutilização da lógica de criação e empilhamento
Para cada item com `nfe_chave`, o endpoint SHALL aplicar a mesma lógica do `POST /api/products` individual: se existir produto ativo com nome igual (case-insensitive) no tenant, soma a quantidade; caso contrário cria produto novo. `tenant_id` e histórico de movimentação SHALL ser mantidos.

#### Scenario: Item com nome já existente
- **WHEN** um item do lote tem nome igual a produto ativo do tenant
- **THEN** a quantidade é somada ao produto existente e uma movimentação de entrada é registrada com `detalhes.nfe_chave`

#### Scenario: Item com nome novo
- **WHEN** um item do lote não tem correspondência de nome no tenant
- **THEN** um produto novo é criado com `tenant_id` correto e uma movimentação de entrada é registrada

### Requirement: Limite de itens por requisição
O endpoint SHALL rejeitar listas com mais de `BATCH_LIMIT` itens (padrão 500, configurável por variável de ambiente). Listas com zero itens SHALL ser rejeitadas com HTTP 400.

#### Scenario: Lista vazia
- **WHEN** o corpo da requisição contém `{ "itens": [] }`
- **THEN** o servidor responde HTTP 400 "A lista de itens não pode estar vazia."

#### Scenario: Lista acima do limite
- **WHEN** o número de itens excede `BATCH_LIMIT`
- **THEN** o servidor responde HTTP 400 com a mensagem de limite máximo

### Requirement: Resposta com totais
O endpoint SHALL retornar HTTP 201 com `{ "criados": N, "empilhados": M }` após sucesso, onde `criados` é o número de novos produtos e `empilhados` é o número de produtos que tiveram quantidade somada.

#### Scenario: Mix de criação e empilhamento
- **WHEN** dos 10 itens da lista, 4 já existem no estoque e 6 são novos
- **THEN** o servidor responde `{ "criados": 6, "empilhados": 4 }`
