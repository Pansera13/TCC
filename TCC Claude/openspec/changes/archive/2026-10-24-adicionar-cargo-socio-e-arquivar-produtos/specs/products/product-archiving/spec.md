## ADDED Requirements

### Requirement: Arquivar produto
O Sócio e o Administrador SHALL poder arquivar um produto. O produto arquivado SHALL permanecer no banco com todo o histórico de movimentações, mas SHALL sair do estoque ativo. Arquivar SHALL substituir "excluir" para o Sócio, que não pode excluir produtos.

#### Scenario: Sócio arquiva um produto
- **WHEN** um Sócio arquiva um produto
- **THEN** o produto some das listas, da busca, do Início, de Sem estoque e dos Relatórios, e o histórico de movimentações é preservado

#### Scenario: Sócio tenta excluir
- **WHEN** um Sócio chama a exclusão definitiva de um produto
- **THEN** o servidor responde 403

#### Scenario: Funcionário tenta arquivar
- **WHEN** um Funcionário chama a rota de arquivar
- **THEN** o servidor responde 403

### Requirement: Efeito do arquivamento nas listas e totais
Listagens, busca, Início, Sem estoque e Relatórios SHALL ignorar produtos arquivados nos totais, contagens, giro e consumo. Movimentações SHALL continuar mostrando o nome do produto arquivado. Entrada, retirada e edição de produto arquivado SHALL ser recusadas.

#### Scenario: Totais sem arquivados
- **WHEN** um produto é arquivado
- **THEN** o total de produtos, o estoque baixo e os esgotados do Início e dos Relatórios deixam de contá-lo

#### Scenario: Histórico preservado
- **WHEN** um produto arquivado tem movimentações
- **THEN** a aba Movimentações continua exibindo essas linhas com o nome do produto

#### Scenario: Ação sobre produto arquivado
- **WHEN** alguém tenta retirar, dar entrada ou editar um produto arquivado
- **THEN** o servidor responde com erro informando que o produto está arquivado e nada é alterado

### Requirement: Visão Arquivados do Administrador
O Administrador SHALL ter uma visão "Arquivados" com os produtos arquivados, onde pode restaurar cada um ou excluí-lo definitivamente. Os demais cargos SHALL NOT acessar essa visão nem a lista de arquivados pela API.

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

### Requirement: Compatibilidade com o Realtime
Arquivar e restaurar SHALL ser atualizações (UPDATE) da linha do produto, e as telas abertas SHALL refletir a mudança em tempo real sem recarregar.

#### Scenario: Outra sessão arquiva
- **WHEN** outra sessão arquiva um produto
- **THEN** o produto some das listas abertas sem recarregar a página

### Requirement: Registro do arquivamento
Arquivar e restaurar SHALL ser registrados em Movimentações, com quem fez, quando e o valor antes/depois do estado, sem criar novos tipos de movimentação no banco.

#### Scenario: Arquivamento no histórico
- **WHEN** um produto é arquivado
- **THEN** aparece uma linha de edição em Movimentações indicando o arquivamento e o usuário
