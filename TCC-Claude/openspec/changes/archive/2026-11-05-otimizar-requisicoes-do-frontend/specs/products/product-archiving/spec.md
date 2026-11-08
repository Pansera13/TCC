# Spec Delta

## MODIFIED Requirements

### Requirement: Visão Arquivados do Administrador
O Administrador SHALL ter uma visão "Arquivados" com os produtos arquivados, onde pode restaurar cada um ou excluí-lo definitivamente. Os demais cargos SHALL NOT acessar essa visão nem a lista de arquivados pela API. A lista SHALL ser mantida em cache em memória: carregada na primeira visita à aba e mantida nas visitas seguintes sem nova requisição. O cache SHALL ser invalidado ao arquivar, restaurar ou excluir um produto, e SHALL ser recarregado ao clicar no botão Atualizar já existente.

#### Scenario: Restaurar produto
- **WHEN** o Administrador restaura um produto arquivado
- **THEN** o produto volta às listas, aos totais e ao estoque ativo com os mesmos dados e histórico

#### Scenario: Excluir definitivamente
- **WHEN** o Administrador exclui definitivamente um produto arquivado que não consta em pedidos
- **THEN** o produto é removido do banco e a exclusão é registrada no histórico

#### Scenario: Produto vinculado a pedidos
- **WHEN** o Administrador tenta excluir definitivamente um produto vinculado a pedidos
- **THEN** o servidor responde 409 com mensagem clara e o produto permanece

#### Scenario: Não-administrador pede os arquivados
- **WHEN** um Sócio ou Funcionário pede a lista de arquivados
- **THEN** o servidor responde 403

#### Scenario: Navegação repetida entre abas
- **WHEN** o Administrador visita a aba Arquivados, troca para outra aba e volta a Arquivados
- **THEN** nenhuma nova requisição é feita; os dados em cache são exibidos imediatamente

#### Scenario: Arquivar invalida o cache
- **WHEN** o Administrador arquiva um produto estando na aba Arquivados ou em outra aba
- **THEN** o cache da lista de arquivados é invalidado e a próxima visita à aba busca dados atualizados

#### Scenario: Botão Atualizar recarrega
- **WHEN** o Administrador clica no botão Atualizar já existente na aba Arquivados
- **THEN** uma nova requisição é feita e o cache é substituído pelos dados recebidos
