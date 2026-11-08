## ADDED Requirements

### Requirement: Linhas de tabela alternam entre tom claro e escuro
Toda tabela de dados do frontend (produtos, esgotados, estoque por categoria/lista e histórico de movimentações) SHALL alternar o fundo de suas linhas de dados entre um tom mais claro e um tom mais escuro, de modo sutil, começando pelo tom claro na primeira linha de dados.

#### Scenario: Linhas consecutivas têm tons diferentes
- **WHEN** uma tabela exibe três ou mais linhas de dados
- **THEN** a 1ª e a 3ª linhas têm o tom claro e a 2ª tem o tom escuro

#### Scenario: Funciona no tema escuro
- **WHEN** o tema escuro está ativo
- **THEN** as linhas alternam entre dois tons escuros distintos, ambos legíveis com o texto existente

#### Scenario: Linhas auxiliares não quebram a alternância
- **WHEN** a tabela contém cabeçalho de categoria, rodapé de paginação ou linha de detalhes de edição
- **THEN** essas linhas não contam na alternância, e cada categoria recomeça com o tom claro

### Requirement: Hover permanece perceptível
O realce de hover de uma linha SHALL continuar visível sobre ambos os tons da alternância.

#### Scenario: Passar o mouse sobre linha clara ou escura
- **WHEN** o usuário passa o mouse sobre uma linha de dados
- **THEN** a linha exibe um fundo de hover distinto do seu tom de alternância

### Requirement: Tabelas centralizadas e compactas
Toda tabela de dados SHALL ser centralizada horizontalmente e, em telas largas, ocupar a maior parte da largura da área de conteúdo (88%), de modo que todas as colunas e textos caibam sem corte.

#### Scenario: Tela larga
- **WHEN** a viewport tem largura igual ou maior que o breakpoint `lg`
- **THEN** a tabela ocupa ~88% da largura da área de conteúdo e fica centralizada, com margens iguais nos lados

#### Scenario: Tela estreita
- **WHEN** a viewport é menor que `lg`
- **THEN** a tabela ocupa a largura total e rola horizontalmente se o conteúdo exceder

### Requirement: Tabelas paginadas com navegação direta
Toda tabela de dados SHALL limitar as linhas exibidas por página e oferecer botões para primeira, anterior, próxima e última página, um seletor para ir diretamente a uma página e a indicação da página atual e do total de páginas. Os controles SHALL ficar ocultos quando houver uma página ou menos.

#### Scenario: Navegar entre páginas
- **WHEN** a tabela tem mais linhas que o limite por página
- **THEN** são exibidas só as linhas da página atual, junto com "Página X de Y" e os controles Primeira, Anterior, Próxima, Última e "Ir para"

#### Scenario: Ir direto a uma página
- **WHEN** o usuário escolhe a página 5 no seletor "Ir para"
- **THEN** a tabela passa a exibir a página 5

#### Scenario: Extremos
- **WHEN** a página atual é a primeira (ou a última)
- **THEN** Primeira e Anterior (ou Próxima e Última) ficam desabilitados

### Requirement: Paginação sempre visível
Nas abas de tabela (Início, Sem estoque, Equipe e Movimentações), o cartão da tabela SHALL ocupar a altura disponível até 1 cm do fim da tela, e os controles de paginação SHALL permanecer visíveis sem rolar a página; o número de linhas por página SHALL se ajustar à altura disponível, de modo que a área das linhas não precise de rolagem vertical.

#### Scenario: Tela baixa
- **WHEN** a janela tem altura menor que a necessária para todas as linhas da página
- **THEN** a página mostra menos linhas, a paginação continua visível no rodapé do cartão e não há rolagem vertical na tabela

### Requirement: Todas as informações do produto na tabela
As tabelas de produtos (Início, Produtos em Lista/Acordeão e Sem estoque) SHALL exibir todos os dados do produto: nome, quantidade, unidade, categoria, fornecedor, peso (kg) e data de cadastro, sem texto cortado.

#### Scenario: Colunas de peso e cadastro
- **WHEN** uma tabela de produtos é exibida
- **THEN** ela inclui as colunas Peso (kg) e Cadastro, com "—" quando o peso não foi informado

### Requirement: Tabelas nunca vazam da tela
Toda tabela de dados SHALL permanecer inteiramente dentro da largura da tela, em qualquer tamanho de janela. Em telas estreitas, colunas secundárias SHALL ser ocultadas por ordem de importância e o texto SHALL quebrar linha.

#### Scenario: Tela estreita
- **WHEN** a janela tem 360 px de largura
- **THEN** nenhuma tabela passa da largura da tela e as colunas essenciais (nome, quantidade, unidade e ações) continuam visíveis

#### Scenario: Tela larga
- **WHEN** a janela tem 1350 px ou mais
- **THEN** todas as colunas do produto são exibidas

### Requirement: Ordenação por coluna
As tabelas de produtos (Início, Produtos, Sem estoque) e a de Equipe SHALL permitir ordenar pelas colunas ao clicar no cabeçalho: texto em ordem alfabética, números do menor para o maior, datas cronologicamente, com valores vazios sempre no fim. Cliques sucessivos SHALL alternar crescente, decrescente e sem ordenação, com indicador visual da coluna e do sentido.

#### Scenario: Ordem alfabética
- **WHEN** o usuário clica em "Nome"
- **THEN** as linhas ficam de A a Z e o cabeçalho mostra ▲; um novo clique inverte para Z a A (▼) e o terceiro remove a ordenação

#### Scenario: Ordem numérica
- **WHEN** o usuário clica em "Qtd."
- **THEN** as linhas ficam da menor para a maior quantidade

#### Scenario: Ordenação volta à primeira página
- **WHEN** o usuário muda a ordenação
- **THEN** a tabela volta para a primeira página; em Produtos a ordem vale dentro de cada categoria
