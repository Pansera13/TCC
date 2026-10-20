# Spec: dashboard/out-of-stock-view

## Purpose

Permite ao usuário identificar rapidamente quais produtos estão com estoque zerado diretamente do dashboard, tornando o card "Sem Estoque" um ponto de entrada para uma view dedicada que lista esses produtos com nome e categoria.

## Requirements

### Requirement: Card Sem Estoque clicável

O card "Sem Estoque" no dashboard SHALL ser clicável e exibir um indicador visual de interatividade (cursor pointer, leve efeito hover). Ao ser clicado, o sistema MUST navegar para a view de produtos esgotados dentro do dashboard, sem abrir nova aba do navegador.

#### Scenario: Clique no card navega para a view

- **WHEN** o usuário clica no card "Sem Estoque"
- **THEN** o sistema exibe a view de produtos esgotados no lugar do conteúdo atual

#### Scenario: Card com zero produtos esgotados

- **WHEN** não há produtos com quantidade zero e o usuário clica no card
- **THEN** a view exibe mensagem informando que não há produtos esgotados no momento

### Requirement: View de produtos esgotados

A view de produtos esgotados MUST listar todos os produtos com `quantidade = 0`, exibindo para cada item: nome do produto e categoria (exibir "Sem Categoria" quando não houver). A lista SHALL ser agrupada ou ordenada de forma que produtos da mesma categoria fiquem próximos. A view MUST exibir o total de produtos esgotados no cabeçalho.

#### Scenario: Listagem de produtos esgotados com categoria

- **WHEN** o usuário acessa a view de produtos esgotados e existem produtos com quantidade zero
- **THEN** cada produto é listado com seu nome e sua categoria (ou "Sem Categoria")

#### Scenario: Retorno ao dashboard

- **WHEN** o usuário está na view de produtos esgotados
- **THEN** é exibido um controle para voltar ao Início ou navegar para outra seção normalmente pelo menu lateral
