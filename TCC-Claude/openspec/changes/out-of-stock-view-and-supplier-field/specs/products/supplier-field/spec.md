# Spec Delta

## Purpose

Permite registrar o fornecedor de cada produto de forma opcional, facilitando o processo de reabastecimento ao manter essa informação visível em todas as listagens e formulários de produtos.

## ADDED Requirements

### Requirement: Campo fornecedor no cadastro de produto

O sistema MUST oferecer um campo de texto livre "Fornecedor" nos formulários de criação e edição de produtos. O campo SHALL ser opcional — sua ausência não impede o salvamento do produto. O valor MUST ser persistido no banco de dados e retornado pela API junto com os demais dados do produto.

#### Scenario: Cadastro com fornecedor preenchido

- **WHEN** o usuário preenche o campo "Fornecedor" e salva o produto
- **THEN** o fornecedor é salvo e exibido nas listagens de produtos

#### Scenario: Cadastro sem fornecedor

- **WHEN** o usuário deixa o campo "Fornecedor" vazio e salva o produto
- **THEN** o produto é salvo normalmente e as listagens exibem "—" na coluna Fornecedor

#### Scenario: Edição do fornecedor existente

- **WHEN** o usuário abre o modal de edição de um produto que já tem fornecedor
- **THEN** o campo "Fornecedor" é pré-preenchido com o valor atual e pode ser alterado ou removido

### Requirement: Fornecedor visível em todas as listagens de produtos

A coluna "Fornecedor" MUST aparecer em todas as tabelas que exibem produtos: visão geral do Início, aba Produtos e aba Categorias. Quando o fornecedor não estiver cadastrado, a célula SHALL exibir "—".

#### Scenario: Coluna visível na aba Produtos

- **WHEN** o usuário acessa a aba Produtos
- **THEN** a tabela exibe uma coluna "Fornecedor" para cada produto listado

#### Scenario: Coluna visível na aba Categorias

- **WHEN** o usuário acessa a aba Categorias
- **THEN** cada tabela de categoria exibe a coluna "Fornecedor" para os produtos do grupo

#### Scenario: Fornecedor ausente exibe traço

- **WHEN** um produto não tem fornecedor cadastrado
- **THEN** a coluna exibe "—" nessa linha
