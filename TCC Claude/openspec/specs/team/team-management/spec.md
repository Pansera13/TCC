# Spec: team/team-management

## Purpose

Define a aba Equipe: quem a vê, quais contas cada cargo cria, ativa, desativa, altera ou exclui.

## Requirements

### Requirement: Aba Equipe por cargo
A aba Equipe SHALL ser visível para Sócio e Administrador e SHALL ficar oculta para Funcionário. A listagem da equipe SHALL ser negada com 403 a Funcionários.

#### Scenario: Funcionário não vê a Equipe
- **WHEN** um Funcionário usa o sistema
- **THEN** a aba Equipe não aparece e a rota de listagem da equipe responde 403

#### Scenario: Sócio vê a Equipe
- **WHEN** um Sócio abre a aba Equipe
- **THEN** vê a lista de todas as contas, mas as ações aparecem apenas nas contas de Funcionário

### Requirement: Criação de contas conforme o cargo
O Sócio SHALL poder criar somente contas de Funcionário. O Administrador SHALL poder criar contas de Funcionário, Sócio e Administrador. O seletor de cargo do cadastro SHALL oferecer somente os cargos que quem está logado pode criar.

#### Scenario: Sócio cria Funcionário
- **WHEN** um Sócio cadastra um membro com cargo Funcionário
- **THEN** a conta é criada

#### Scenario: Sócio tenta criar Sócio ou Administrador
- **WHEN** um Sócio envia o cadastro de uma conta de Sócio ou Administrador (pela interface ou diretamente pela API)
- **THEN** o servidor responde 403 e nenhuma conta é criada

#### Scenario: Cargos oferecidos no cadastro
- **WHEN** o modal de novo membro é aberto
- **THEN** o Sócio vê apenas Funcionário e o Administrador vê Funcionário, Sócio e Administrador

### Requirement: Ativar e desativar contas
O Sócio SHALL poder ativar e desativar contas de Funcionário. O Administrador SHALL poder ativar e desativar qualquer conta, menos a própria. Uma conta desativada SHALL perder o acesso ao sistema imediatamente.

#### Scenario: Sócio desativa Funcionário
- **WHEN** um Sócio desativa uma conta de Funcionário
- **THEN** a conta fica inativa e perde o acesso

#### Scenario: Sócio tenta desativar Sócio ou Administrador
- **WHEN** um Sócio tenta desativar uma conta de Sócio ou Administrador
- **THEN** o servidor responde 403 e a conta continua ativa

### Requirement: Mudança de cargo e exclusão de usuário
Somente o Administrador SHALL poder mudar cargos e excluir usuários. O Administrador SHALL NOT poder mudar o próprio cargo nem excluir a própria conta.

#### Scenario: Sócio tenta mudar cargo ou excluir
- **WHEN** um Sócio tenta mudar o cargo de uma conta ou excluí-la, mesmo sendo de Funcionário
- **THEN** o servidor responde 403

#### Scenario: Administrador muda cargo
- **WHEN** um Administrador muda o cargo de outra conta
- **THEN** a mudança é salva e vale já na próxima requisição daquela conta

### Requirement: Botões conforme o cargo
Na aba Equipe, os controles de cada linha (alterar cargo, ativar/desativar, excluir) SHALL aparecer somente quando o usuário logado tem permissão sobre aquela conta; caso contrário a célula de ações mostra "—".

#### Scenario: Sócio vê controles limitados
- **WHEN** um Sócio olha a lista da equipe
- **THEN** apenas as linhas de Funcionário têm o controle de ativar/desativar; não há controle de cargo nem de exclusão
