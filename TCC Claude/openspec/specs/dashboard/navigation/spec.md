# Spec: dashboard/navigation

## Purpose

Define o conjunto de abas do Dashboard do StockFlow e a navegação entre elas, de modo que cada aba tenha uma função distinta e sem duplicidade.

## Requirements

### Requirement: Conjunto de abas do menu de navegação
O menu de navegação do Dashboard SHALL listar, nesta ordem, as abas Início, Produtos, Movimentações, Relatórios, Arquivados e Equipe. A aba Arquivados SHALL aparecer somente para usuários com permissão `produto:ver-arquivados` (Sócio e Administrador). A aba Equipe SHALL aparecer somente para usuários com permissão `equipe:ver` (Administrador). O sistema SHALL NOT exibir uma aba Categorias.

#### Scenario: Funcionário vê as abas sem Equipe e sem Arquivados
- **WHEN** um Funcionário abre o Dashboard
- **THEN** o menu lista Início, Produtos, Movimentações e Relatórios, nessa ordem, sem Equipe, sem Arquivados e sem Categorias

#### Scenario: Sócio vê a aba Arquivados mas não Equipe
- **WHEN** um Sócio abre o Dashboard
- **THEN** o menu lista Início, Produtos, Movimentações, Relatórios e Arquivados, sem Equipe

#### Scenario: Administrador vê Arquivados e Equipe
- **WHEN** um Administrador abre o Dashboard
- **THEN** o menu lista Início, Produtos, Movimentações, Relatórios, Arquivados e Equipe, nessa ordem

#### Scenario: Aba Categorias não existe
- **WHEN** qualquer usuário navega pelo menu de navegação
- **THEN** não há item "Categorias" e nenhuma ação da interface leva a uma tela de categorias

### Requirement: Aba Sem estoque continua acessível pelo card
A tela Início SHALL manter o card "Sem Estoque" como atalho para a lista de produtos esgotados, e essa tela SHALL continuar mostrando apenas produtos com quantidade zero e o botão de voltar ao Início.

#### Scenario: Abrir produtos esgotados pelo card
- **WHEN** o usuário clica no card "Sem Estoque" na tela Início
- **THEN** o sistema mostra a lista de produtos esgotados com a contagem

### Requirement: Abas preservadas não mudam de comportamento
As abas Início, Sem estoque e Equipe SHALL manter o comportamento atual, e a atualização em tempo real da lista de produtos SHALL continuar refletindo inserções, alterações e remoções feitas por outras sessões.

#### Scenario: Atualização em tempo real após a reorganização
- **WHEN** outra sessão altera a quantidade de um produto
- **THEN** a tela Início e a lista de produtos exibem o novo valor sem recarregar a página
