# Spec: dashboard/reports

## Purpose

Oferece a aba Relatórios, com indicadores de consumo e giro de estoque calculados a partir das movimentações e dos produtos, filtráveis por período e exportáveis em CSV.

## Requirements

### Requirement: Filtro de período dos relatórios
A aba Relatórios SHALL oferecer os períodos de 7, 30 e 90 dias e um período personalizado com data inicial e final, com 30 dias como padrão. Os indicadores de movimentação SHALL considerar apenas o período escolhido.

#### Scenario: Troca de período
- **WHEN** o usuário seleciona 90 dias
- **THEN** todos os indicadores de movimentação são recalculados para os últimos 90 dias

#### Scenario: Período personalizado inválido
- **WHEN** o usuário informa data final anterior à data inicial
- **THEN** a interface avisa o erro e não atualiza os indicadores

### Requirement: Resumo do período
Os relatórios SHALL exibir o total de produtos, a quantidade de produtos com estoque baixo (acima de 0 e até 3), a quantidade de esgotados e o total de entradas e de saídas do período. Os três primeiros valores SHALL refletir o estoque atual, e os totais de entradas e saídas SHALL refletir apenas o período.

#### Scenario: Resumo com movimentações
- **WHEN** o período contém entradas e retiradas
- **THEN** o resumo mostra a soma das quantidades de entradas e a soma das quantidades de saídas desse período

#### Scenario: Edições e remoções não entram nos totais
- **WHEN** o período contém registros de edição e remoção
- **THEN** esses registros não somam nos totais de entradas e saídas

### Requirement: Top 10 produtos mais retirados
Os relatórios SHALL listar até 10 produtos com maior quantidade retirada no período, em ordem decrescente, com a quantidade retirada de cada um.

#### Scenario: Ranking
- **WHEN** há retiradas de mais de 10 produtos no período
- **THEN** a lista mostra exatamente os 10 com maior quantidade retirada, do maior para o menor

### Requirement: Giro de estoque por produto
Os relatórios SHALL exibir, por produto, o giro de estoque no período, calculado como a quantidade retirada no período dividida pela quantidade atual em estoque. Produto sem estoque atual SHALL exibir "—" no lugar do giro.

#### Scenario: Produto com giro calculável
- **WHEN** um produto teve 30 unidades retiradas no período e tem 10 em estoque
- **THEN** o giro exibido é 3,0

#### Scenario: Produto sem estoque
- **WHEN** um produto tem quantidade atual zero
- **THEN** o giro é exibido como "—"

### Requirement: Consumo por categoria
Os relatórios SHALL exibir a quantidade retirada no período agrupada por categoria, incluindo "Sem Categoria" para produtos sem categoria.

#### Scenario: Consumo agrupado
- **WHEN** há retiradas de produtos de duas categorias
- **THEN** cada categoria aparece com a soma das suas retiradas no período

### Requirement: Exportação em CSV
A aba Relatórios SHALL permitir baixar um arquivo CSV com o resumo, o top 10, o giro por produto e o consumo por categoria do período escolhido, com acentuação preservada e abrindo corretamente em planilhas em português.

#### Scenario: Exportar relatório
- **WHEN** o usuário clica em exportar CSV com o período de 30 dias
- **THEN** o navegador baixa um arquivo cujo nome indica o período e cujo conteúdo corresponde aos indicadores exibidos

### Requirement: Relatórios em celular e modo escuro
A aba Relatórios SHALL ser utilizável em telas estreitas, sem rolagem horizontal da página, e SHALL respeitar os modos claro e escuro.

#### Scenario: Abrir em tela de celular
- **WHEN** a aba Relatórios é aberta em uma tela de 360 px de largura
- **THEN** os blocos se reorganizam em coluna única e permanecem legíveis nos dois modos

### Requirement: Acesso autenticado
Os dados dos relatórios SHALL ser fornecidos somente a usuários autenticados.

#### Scenario: Requisição sem login
- **WHEN** os dados de relatório são solicitados sem credenciais válidas
- **THEN** o sistema responde com falta de autorização e não devolve dados
