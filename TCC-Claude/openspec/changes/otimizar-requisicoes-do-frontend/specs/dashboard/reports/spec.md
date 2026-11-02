# Spec Delta

## MODIFIED Requirements

### Requirement: Filtro de período dos relatórios
A aba Relatórios SHALL oferecer os períodos de 7, 30 e 90 dias e um período personalizado com data inicial e final, com 30 dias como padrão. Os indicadores de movimentação SHALL considerar apenas o período escolhido. Alterações de data no modo personalizado SHALL disparar a consulta apenas após 500 ms sem nova alteração (debounce). Trocar o seletor de período para "Personalizado" SHALL NOT disparar uma nova consulta; a consulta do período anterior permanece visível até o usuário informar datas válidas.

#### Scenario: Troca de período predefinido
- **WHEN** o usuário seleciona 90 dias
- **THEN** todos os indicadores de movimentação são recalculados para os últimos 90 dias

#### Scenario: Período personalizado inválido
- **WHEN** o usuário informa data final anterior à data inicial
- **THEN** a interface avisa o erro e não atualiza os indicadores

#### Scenario: Digitação de data com debounce
- **WHEN** o usuário altera a data inicial do período personalizado
- **THEN** nenhuma consulta é disparada imediatamente; a consulta ocorre somente após 500 ms sem nova alteração

#### Scenario: Clique em Personalizado não refaz consulta
- **WHEN** o usuário clica em "Personalizado" enquanto o relatório de 30 dias está visível
- **THEN** os dados de 30 dias permanecem na tela e nenhuma nova requisição é enviada até que datas válidas sejam informadas
