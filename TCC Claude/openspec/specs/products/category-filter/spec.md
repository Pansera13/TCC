# Spec: products/category-filter

## Purpose

Permite ao usuário filtrar os produtos da aba Produtos por uma categoria específica, exibindo somente os produtos daquela categoria em todos os layouts disponíveis.

## Requirements

### Requirement: Seletor de categoria na toolbar de produtos
A toolbar da aba Produtos SHALL exibir um seletor (dropdown) de categoria entre a barra de busca e o seletor de layout. O seletor SHALL listar todas as categorias existentes nos produtos do tenant (sem filtragem por busca), em ordem alfabética, precedidas pela opção "Todas as categorias".

#### Scenario: Dropdown listado com categorias reais
- **WHEN** o usuário abre a aba Produtos com produtos de múltiplas categorias cadastrados
- **THEN** o dropdown exibe "🗂️ Todas as categorias" como primeira opção, seguida pelas categorias em ordem alfabética

#### Scenario: Produto sem categoria
- **WHEN** existem produtos com campo `categoria` nulo ou vazio
- **THEN** esses produtos aparecem sob a categoria "Sem Categoria" no dropdown e na listagem

### Requirement: Aplicar filtro de categoria
Ao selecionar uma categoria no dropdown, o sistema SHALL exibir somente os produtos dessa categoria, nos quatro layouts (lista, acordeão, grade e compacto). Os demais produtos SHALL ser ocultados.

#### Scenario: Categoria selecionada
- **WHEN** o usuário seleciona "Bebidas" no dropdown
- **THEN** apenas os produtos da categoria "Bebidas" aparecem, nos grupos/cards/linhas correspondentes

#### Scenario: Filtro ativo muda a borda do dropdown
- **WHEN** uma categoria está selecionada
- **THEN** o dropdown exibe borda roxa para indicar que o filtro está ativo

### Requirement: Limpar filtro de categoria
O usuário SHALL poder remover o filtro de categoria selecionando a opção "Todas as categorias" no dropdown. Ao digitar na barra de busca, o filtro de categoria SHALL ser limpo automaticamente e todas as categorias com resultados voltam a aparecer.

#### Scenario: Voltar para todas as categorias
- **WHEN** o usuário seleciona "🗂️ Todas as categorias" no dropdown
- **THEN** produtos de todas as categorias voltam a aparecer

#### Scenario: Busca limpa o filtro de categoria
- **WHEN** o usuário tem uma categoria filtrada e começa a digitar na busca
- **THEN** o dropdown volta para "Todas as categorias" e a busca atua sobre todos os produtos

### Requirement: Filtro de categoria independente de layout
O filtro SHALL funcionar identicamente nos quatro layouts de produto (lista, acordeão, grade e compacto) e ao trocar de layout o filtro permanece aplicado.

#### Scenario: Trocar layout com filtro ativo
- **WHEN** o usuário filtra por "Carnes" e muda do layout Lista para Grade
- **THEN** apenas produtos de "Carnes" aparecem no layout Grade

#### Scenario: Página de categoria volta para 1 ao filtrar
- **WHEN** o usuário seleciona uma categoria no dropdown
- **THEN** a paginação de todas as categorias volta para a página 1
