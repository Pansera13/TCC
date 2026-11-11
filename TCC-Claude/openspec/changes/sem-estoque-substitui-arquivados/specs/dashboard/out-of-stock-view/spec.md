# Spec Delta

## MODIFIED Requirements

### Requirement: View de produtos esgotados

A aba Sem estoque MUST listar todos os produtos com `quantidade = 0`, para qualquer cargo, exibindo para cada item: nome do produto e categoria (exibir "Sem Categoria" quando não houver). A lista SHALL ser agrupada ou ordenada de forma que produtos da mesma categoria fiquem próximos. A aba MUST exibir o total de produtos esgotados no cabeçalho. A lista SHALL refletir a quantidade atual: o produto entra na lista quando sua quantidade chega a zero e sai quando deixa de ser zero.

#### Scenario: Listagem de produtos esgotados com categoria

- **WHEN** o usuário acessa a aba Sem estoque e existem produtos com quantidade zero
- **THEN** cada produto é listado com seu nome e sua categoria (ou "Sem Categoria")

#### Scenario: Retorno ao dashboard

- **WHEN** o usuário está na aba Sem estoque
- **THEN** é exibido um controle para voltar ao Início, e as demais seções continuam acessíveis pelo menu de navegação

#### Scenario: Produto zera numa retirada

- **WHEN** uma retirada leva a quantidade de um produto a zero
- **THEN** o produto desaparece da aba Produtos e aparece na aba Sem estoque sem recarregar a página

#### Scenario: Produto volta ao receber entrada

- **WHEN** um produto da aba Sem estoque recebe uma entrada maior que zero
- **THEN** o produto sai da aba Sem estoque e volta a aparecer na aba Produtos, na sua categoria

## ADDED Requirements

### Requirement: Produtos sem estoque saem das demais listas
A aba Produtos (categorias, filtro de categoria e busca) e a tabela "Visão geral dos produtos" do Início SHALL NOT exibir produtos com quantidade zero. Os cartões de indicadores do Início SHALL continuar contando todos os produtos, inclusive os sem estoque.

#### Scenario: Produto zerado some da aba Produtos
- **WHEN** existe um produto com quantidade zero
- **THEN** ele não aparece em nenhuma categoria da aba Produtos, nem nos resultados de busca dessa aba

#### Scenario: Produto zerado some da visão geral do Início
- **WHEN** existe um produto com quantidade zero
- **THEN** ele não aparece na tabela "Visão geral dos produtos" do Início

#### Scenario: Cartões continuam contando todos
- **WHEN** existem 10 produtos e 2 deles estão com quantidade zero
- **THEN** o cartão "Total de Produtos" mostra 10 e o cartão "Sem Estoque" mostra 2

### Requirement: Reposição a partir da aba Sem estoque
Cada linha da aba Sem estoque SHALL oferecer a ação Entrada para todos os cargos e a ação Editar somente a quem tem a permissão `produto:editar`. A linha SHALL NOT oferecer Retirar, pois o produto não tem saldo.

#### Scenario: Repor um produto sem estoque
- **WHEN** qualquer usuário clica em Entrada numa linha da aba Sem estoque e confirma uma quantidade maior que zero
- **THEN** a entrada é registrada e o produto passa a aparecer na aba Produtos

#### Scenario: Editar sem permissão
- **WHEN** um Funcionário abre a aba Sem estoque
- **THEN** as linhas mostram Entrada, mas não mostram Editar

#### Scenario: Editar com permissão
- **WHEN** um Sócio ou Administrador clica em Editar numa linha da aba Sem estoque
- **THEN** abre o modal de edição do produto
