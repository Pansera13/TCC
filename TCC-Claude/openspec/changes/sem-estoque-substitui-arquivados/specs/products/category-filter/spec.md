# Spec Delta

## MODIFIED Requirements

### Requirement: Seletor de categoria na toolbar de produtos
A toolbar da aba Produtos SHALL exibir um seletor (dropdown) de categoria entre a barra de busca e o seletor de layout. O seletor SHALL listar todas as categorias existentes nos produtos com estoque do tenant (sem filtragem por busca), em ordem alfabética, precedidas pela opção "Todas as categorias". Categorias cujos produtos estão todos sem estoque SHALL NOT aparecer.

#### Scenario: Dropdown listado com categorias reais
- **WHEN** o usuário abre a aba Produtos com produtos de múltiplas categorias cadastrados
- **THEN** o dropdown exibe "🗂️ Todas as categorias" como primeira opção, seguida pelas categorias em ordem alfabética

#### Scenario: Produto sem categoria
- **WHEN** existem produtos com campo `categoria` nulo ou vazio
- **THEN** esses produtos aparecem sob a categoria "Sem Categoria" no dropdown e na listagem

#### Scenario: Categoria só com produtos sem estoque
- **WHEN** todos os produtos de uma categoria estão com quantidade zero
- **THEN** a categoria não aparece no dropdown nem na listagem da aba Produtos, e volta a aparecer quando um desses produtos recebe entrada
