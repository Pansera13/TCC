# Spec: dashboard/product-pagination

## Purpose

Limita a quantidade de produtos exibidos por vez na aba Produtos, paginando cada categoria de forma independente e idêntica nos quatro layouts (lista, acordeão, grade e compacto).

## Requirements

### Requirement: Limite de produtos por categoria e por página
A aba Produtos SHALL exibir no máximo 15 produtos por categoria em cada página, nos layouts lista, acordeão, grade e compacto. Esse limite SHALL ser definido em um único ponto da aplicação, de modo que alterá-lo mude todos os layouts.

#### Scenario: Categoria com mais de 15 produtos
- **WHEN** uma categoria tem 40 produtos e o usuário abre a aba Produtos
- **THEN** a categoria mostra os 15 primeiros produtos e indica "Página 1 de 3"

#### Scenario: Mesmo limite em todos os layouts
- **WHEN** o usuário troca entre lista, acordeão, grade e compacto
- **THEN** cada categoria continua mostrando no máximo 15 produtos por página

### Requirement: Controles de paginação por categoria
Cada categoria com mais de 15 produtos SHALL exibir controles de primeira página, página anterior, próxima página e última página, e o texto "Página X de Y". Os controles que não têm efeito SHALL ficar desabilitados. Categorias com 15 produtos ou menos SHALL NOT exibir controles.

#### Scenario: Primeira página
- **WHEN** a categoria está na página 1 de 3
- **THEN** "Primeira" e "Anterior" ficam desabilitados e "Próxima" e "Última" ficam habilitados

#### Scenario: Última página
- **WHEN** a categoria está na página 3 de 3
- **THEN** "Próxima" e "Última" ficam desabilitados e "Primeira" e "Anterior" ficam habilitados

#### Scenario: Categoria pequena
- **WHEN** uma categoria tem exatamente 15 produtos
- **THEN** nenhum controle de paginação aparece para essa categoria

### Requirement: Página independente por categoria
Cada categoria SHALL manter a própria página atual, sem alterar a página das demais.

#### Scenario: Navegar em uma categoria
- **WHEN** o usuário avança a categoria "Bebidas" para a página 2
- **THEN** as outras categorias permanecem na página em que estavam

### Requirement: Busca volta todas as categorias para a página 1
Ao alterar o texto de busca, o sistema SHALL reposicionar todas as categorias na página 1. Quando a quantidade de produtos de uma categoria diminuir de modo que a página atual deixe de existir, o sistema SHALL exibir a última página existente.

#### Scenario: Buscar durante a navegação
- **WHEN** o usuário está na página 3 de uma categoria e digita um termo na busca
- **THEN** todas as categorias com resultados voltam à página 1 e o total de páginas reflete o filtro

#### Scenario: Produto removido em tempo real na última página
- **WHEN** a categoria está na última página, que tem um único produto, e esse produto é removido por outra sessão
- **THEN** a categoria passa a exibir a nova última página, sem página vazia

### Requirement: Paginação em celular e modo escuro
Os controles de paginação SHALL ser utilizáveis em telas estreitas, sem rolagem horizontal da página, e SHALL respeitar os estilos do modo claro e do modo escuro.

#### Scenario: Controles em tela de celular
- **WHEN** a aba Produtos é aberta em uma tela de 360 px de largura
- **THEN** os controles cabem na largura da tela e permanecem legíveis nos modos claro e escuro
