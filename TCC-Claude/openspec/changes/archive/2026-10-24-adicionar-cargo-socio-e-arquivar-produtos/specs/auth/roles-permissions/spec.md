## ADDED Requirements

### Requirement: Três cargos com herança
O sistema SHALL ter os cargos Funcionário (`user`), Sócio (`socio`) e Administrador (`admin`), nesta ordem crescente de nível, e cada cargo SHALL herdar todas as permissões do inferior. Os rótulos exibidos SHALL ser "Funcionário", "Sócio" e "Administrador". Contas existentes SHALL continuar funcionando sem migração de dados, mantendo `user` para Funcionário.

#### Scenario: Herança entre cargos
- **WHEN** uma permissão é concedida ao Funcionário
- **THEN** Sócio e Administrador também a possuem; e o que é do Sócio, o Administrador também possui

#### Scenario: Rótulo do cargo antigo
- **WHEN** uma conta com cargo `user` é exibida em qualquer tela
- **THEN** o cargo aparece como "Funcionário" e o termo "Operador" não é usado

### Requirement: Matriz de permissões
O sistema SHALL aplicar a seguinte matriz de permissões:
- **Funcionário**: ver Início, Produtos, Sem estoque e Movimentações (somente as próprias); registrar entrada e retirada.
- **Sócio**: tudo do Funcionário, mais cadastrar produtos, editar produtos, arquivar produtos, importar NF-e, ver Relatórios, ver o histórico completo de Movimentações, ver a aba Equipe, criar contas de Funcionário e ativar ou desativar contas de Funcionário.
- **Administrador**: tudo do Sócio, mais restaurar produtos arquivados, excluir produtos definitivamente, excluir usuários, criar contas de Sócio e Administrador, mudar cargos e gerenciar contas de Sócio e Administrador.

#### Scenario: Funcionário em uma ação de Sócio
- **WHEN** um Funcionário tenta cadastrar, editar ou arquivar um produto, ver Relatórios ou listar a equipe
- **THEN** a requisição é recusada com 403

#### Scenario: Sócio em uma ação de Administrador
- **WHEN** um Sócio tenta restaurar ou excluir definitivamente um produto, excluir um usuário, mudar um cargo ou criar uma conta de Sócio ou Administrador
- **THEN** a requisição é recusada com 403

#### Scenario: Administrador com acesso total
- **WHEN** um Administrador executa qualquer ação da matriz
- **THEN** a ação é permitida, exceto alterar o próprio cargo

### Requirement: Ações exclusivas do Administrador
As seguintes ações SHALL ser exclusivas do Administrador: exclusão definitiva de produto, restaurar produto arquivado, exclusão de usuário, mudança de cargo, criação de contas de Sócio ou Administrador e qualquer alteração em contas de Sócio ou Administrador (incluindo ativar ou desativar).

#### Scenario: Sócio tenta alterar conta de Sócio ou Administrador
- **WHEN** um Sócio tenta alterar, desativar ou excluir a conta de outro Sócio ou de um Administrador
- **THEN** a requisição é recusada com 403 e a conta não é modificada

### Requirement: Ninguém altera o próprio cargo
Nenhum usuário, inclusive o Administrador, SHALL conseguir alterar o próprio cargo.

#### Scenario: Troca do próprio cargo
- **WHEN** um usuário tenta mudar o cargo da própria conta
- **THEN** a requisição é recusada e o cargo permanece o mesmo

### Requirement: Permissão imposta no backend por nível
Cada rota protegida SHALL exigir o nível ou a permissão correspondente por middleware no backend. O frontend SHALL apenas esconder ou mostrar botões e abas conforme as permissões informadas pelo servidor, sem ser a barreira de segurança.

#### Scenario: Requisição direta à API
- **WHEN** um Funcionário ou Sócio chama diretamente uma rota proibida, sem usar a interface
- **THEN** o servidor responde 403, independentemente do que a interface mostra

#### Scenario: Cargo sempre vindo do banco
- **WHEN** o cargo de uma conta é alterado enquanto ela tem sessão aberta
- **THEN** a próxima requisição já é avaliada com o cargo atual do banco, não o do token

### Requirement: Fonte única de níveis e permissões
Os níveis dos cargos e a matriz de permissões SHALL ser definidos em um único lugar no backend. O frontend SHALL obter do servidor a lista de permissões da sessão e não SHALL comparar nomes de cargo espalhados pelo código.

#### Scenario: Frontend lê as permissões do servidor
- **WHEN** o painel é aberto
- **THEN** ele recebe do servidor as permissões do usuário e usa essa lista para decidir abas e botões
