# Spec Delta

## MODIFIED Requirements

### Requirement: Ordenação e paginação do histórico
O histórico SHALL listar os registros do mais recente para o mais antigo e SHALL ser paginado, sem o limite fixo de 500 linhas, com indicação da página atual e do total de páginas. A primeira consulta ao servidor SHALL ser feita somente após o `pageSize` se estabilizar: enquanto `useFitRows` ainda estiver ajustando o número de linhas por página, nenhuma requisição SHALL ser enviada.

#### Scenario: Histórico maior que uma página
- **WHEN** existem mais registros do que cabem em uma página
- **THEN** a primeira página traz os mais recentes e o usuário alcança os mais antigos pelos controles de página

#### Scenario: Primeira abertura do histórico
- **WHEN** o componente monta e useFitRows ainda está calculando o pageSize ideal
- **THEN** nenhuma requisição é enviada até o pageSize estabilizar, resultando em exatamente 1 requisição por abertura
