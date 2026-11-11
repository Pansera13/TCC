# Spec Delta

## ADDED Requirements

### Requirement: Abas do menu de navegação
O menu de navegação do Dashboard SHALL listar, nesta ordem, as abas Início, Produtos, Movimentações, Relatórios e Sem estoque. A aba Relatórios SHALL aparecer somente para usuários com permissão `relatorio:ver` (Sócio e Administrador). A aba Sem estoque SHALL aparecer para todos os cargos. O sistema SHALL NOT exibir as abas Categorias, Arquivados nem Equipe.

#### Scenario: Funcionário vê as abas sem Relatórios
- **WHEN** um Funcionário abre o Dashboard
- **THEN** o menu lista Início, Produtos, Movimentações e Sem estoque, nessa ordem, sem Relatórios

#### Scenario: Sócio e Administrador veem Relatórios
- **WHEN** um Sócio ou um Administrador abre o Dashboard
- **THEN** o menu lista Início, Produtos, Movimentações, Relatórios e Sem estoque, nessa ordem

#### Scenario: Abas removidas não existem
- **WHEN** qualquer usuário navega pelo menu de navegação
- **THEN** não há itens "Categorias", "Arquivados" nem "Equipe", e nenhuma ação da interface leva a essas telas

## MODIFIED Requirements

### Requirement: Aba Sem estoque continua acessível pelo card
A tela Início SHALL manter o card "Sem Estoque" como atalho para a aba Sem estoque, que também está no menu de navegação. A aba SHALL mostrar apenas produtos com quantidade zero e um controle para voltar ao Início.

#### Scenario: Abrir produtos esgotados pelo card
- **WHEN** o usuário clica no card "Sem Estoque" na tela Início
- **THEN** o sistema mostra a aba Sem estoque com a lista de produtos esgotados e a contagem

#### Scenario: Abrir produtos esgotados pelo menu
- **WHEN** o usuário clica em "Sem estoque" no menu de navegação
- **THEN** o sistema mostra a mesma aba Sem estoque, com o item do menu marcado como ativo

### Requirement: Abas preservadas não mudam de comportamento
As abas Início, Produtos e Movimentações SHALL manter o comportamento atual, exceto pela ausência de produtos com quantidade zero em Início e Produtos (definida em `dashboard/out-of-stock-view`). A atualização em tempo real da lista de produtos SHALL continuar refletindo inserções, alterações e remoções feitas por outras sessões.

#### Scenario: Atualização em tempo real após a reorganização
- **WHEN** outra sessão altera a quantidade de um produto
- **THEN** a tela Início e a lista de produtos exibem o novo valor sem recarregar a página, e o produto muda para a aba Sem estoque se a nova quantidade for zero

## REMOVED Requirements

### Requirement: Conjunto de abas do menu de navegação
**Reason**: O conjunto de abas mudou: Arquivados sai e Sem estoque entra para todos os cargos, e a aba Equipe já não existe. O requisito é substituído por "Abas do menu de navegação".
**Migration**: Ver o requisito "Abas do menu de navegação" desta mesma spec.
