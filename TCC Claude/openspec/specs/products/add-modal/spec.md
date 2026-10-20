# Spec: products/add-modal

## Purpose

Permite que o usuário adicione produtos ao estoque pelo Dashboard, escolhendo entre preenchimento manual de formulário ou leitura automática via câmera de NF-e.

## Requirements

### Requirement: Modal abre ao clicar em "Novo produto"
O sistema SHALL exibir um modal de adição de produto quando o usuário clicar no botão "+ Novo produto" na seção de produtos do Dashboard.

#### Scenario: Abertura do modal
- **WHEN** o usuário clica no botão "+ Novo produto"
- **THEN** o sistema exibe um modal centralizado na tela com duas opções visíveis: "Manual" e "Câmera"

### Requirement: Seleção de modo de entrada
O modal SHALL apresentar duas opções de entrada — Manual e Câmera — e exibir o conteúdo correspondente ao modo selecionado.

#### Scenario: Usuário seleciona modo Manual
- **WHEN** o usuário clica na opção "Manual" no modal
- **THEN** o sistema exibe o formulário de cadastro manual

#### Scenario: Usuário seleciona modo Câmera
- **WHEN** o usuário clica na opção "Câmera" no modal
- **THEN** o sistema inicia o fluxo de leitura de NF-e via câmera

### Requirement: Formulário de cadastro manual
O sistema SHALL fornecer um formulário com os campos: nome do produto (obrigatório), quantidade (obrigatório, numérico positivo), unidade de medida (obrigatório, opções: UN, KG, L, CX) e categoria (opcional). O campo "Peso (kg)" foi removido — a seleção da unidade KG é suficiente para indicar que a grandeza é em quilogramas.

#### Scenario: Preenchimento válido e salvamento
- **WHEN** o usuário preenche nome, quantidade e unidade e clica em "Salvar"
- **THEN** o sistema salva o produto no estoque e fecha o modal

#### Scenario: Campos obrigatórios vazios
- **WHEN** o usuário clica em "Salvar" com algum campo obrigatório vazio
- **THEN** o sistema exibe mensagem de erro no campo faltante e não fecha o modal

#### Scenario: Quantidade inválida
- **WHEN** o usuário informa quantidade menor ou igual a zero ou não numérica
- **THEN** o sistema exibe erro no campo "Quantidade" e impede o salvamento

#### Scenario: Campo Peso não aparece no formulário
- **WHEN** o usuário abre o modo Manual do modal
- **THEN** o formulário exibe apenas nome, quantidade, unidade e categoria — sem campo de peso separado

### Requirement: Cancelamento do modal
O sistema SHALL permitir fechar o modal sem salvar, tanto pelo botão "Cancelar" quanto por clique fora do modal ou tecla Escape.

#### Scenario: Fechar pelo botão Cancelar
- **WHEN** o usuário clica em "Cancelar" ou no X do modal
- **THEN** o modal fecha sem criar nenhum produto

#### Scenario: Fechar por clique externo ou Escape
- **WHEN** o usuário pressiona Escape ou clica fora da área do modal
- **THEN** o modal fecha sem criar nenhum produto

### Requirement: Botão "Sair" sempre visível no header
O header do Dashboard SHALL exibir o botão "Sair" completamente dentro da área visível, independente do tamanho da tela ou estado da sidebar.

#### Scenario: Header sem overflow
- **WHEN** o Dashboard é renderizado em qualquer resolução suportada
- **THEN** o botão "Sair" é totalmente visível e não fica cortado pela borda da tela
