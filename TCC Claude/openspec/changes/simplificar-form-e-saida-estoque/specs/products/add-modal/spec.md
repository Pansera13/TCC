# Spec Delta

## MODIFIED Requirements

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
