## Purpose

Permitir que cada pessoa crie uma conta, autentique-se e acesse apenas o seu próprio estoque, garantindo que os dados de produtos, notas e movimentações fiquem isolados por usuário.

## ADDED Requirements

### Requirement: Cadastro de usuário
O sistema SHALL permitir o cadastro de um novo usuário com e-mail e senha, rejeitando e-mails já utilizados e senhas que não atendam à política mínima.

#### Scenario: Cadastro bem-sucedido
- **WHEN** um visitante envia um e-mail válido e ainda não cadastrado com uma senha que atende à política mínima
- **THEN** o sistema cria a conta, armazena a senha de forma irreversível (hash) e permite que o usuário faça login

#### Scenario: E-mail já cadastrado
- **WHEN** um visitante tenta se cadastrar com um e-mail que já pertence a uma conta
- **THEN** o sistema rejeita o cadastro e informa que o e-mail já está em uso, sem revelar outros dados da conta

#### Scenario: Senha fraca
- **WHEN** um visitante tenta se cadastrar com uma senha abaixo da política mínima (mínimo de 8 caracteres)
- **THEN** o sistema rejeita o cadastro e informa o requisito de senha

### Requirement: Tela de login
O sistema SHALL apresentar como tela inicial (para visitante não autenticado) uma tela de login contendo um campo de login (e-mail), um campo de senha e um botão de entrar, além de um botão pequeno/secundário de cadastro que leva à tela de criação de conta.

#### Scenario: Composição da tela de login
- **WHEN** um visitante não autenticado abre a aplicação
- **THEN** o sistema exibe o campo de login (e-mail), o campo de senha, o botão de entrar e um botão pequeno de cadastro

#### Scenario: Acesso ao cadastro pela tela de login
- **WHEN** o visitante toca/clica no botão pequeno de cadastro
- **THEN** o sistema abre a tela de criação de conta

#### Scenario: Entrar pela tela de login
- **WHEN** o visitante preenche login e senha e aciona o botão de entrar
- **THEN** o sistema submete as credenciais para autenticação

### Requirement: Autenticação e sessão
O sistema SHALL autenticar o usuário por e-mail e senha e manter uma sessão válida que expira após período de inatividade, permitindo encerrá-la explicitamente.

#### Scenario: Login com credenciais válidas
- **WHEN** um usuário cadastrado envia e-mail e senha corretos
- **THEN** o sistema estabelece uma sessão autenticada e concede acesso ao seu estoque

#### Scenario: Login com credenciais inválidas
- **WHEN** um usuário envia e-mail ou senha incorretos
- **THEN** o sistema nega o acesso com uma mensagem genérica que não revela se o e-mail existe

#### Scenario: Logout
- **WHEN** um usuário autenticado solicita sair
- **THEN** o sistema encerra a sessão e passa a exigir novo login para qualquer operação protegida

### Requirement: Isolamento de dados por conta
O sistema SHALL garantir que todo dado de estoque (produtos, saldos, notas importadas e movimentações) pertença a uma conta e só seja legível ou modificável pelo usuário dono dessa conta.

#### Scenario: Acesso restrito ao próprio estoque
- **WHEN** um usuário autenticado consulta ou altera dados de estoque
- **THEN** o sistema retorna e aceita alterações apenas sobre os dados vinculados à sua própria conta

#### Scenario: Tentativa de acesso a dados de outra conta
- **WHEN** um usuário autenticado tenta acessar um recurso de estoque pertencente a outra conta
- **THEN** o sistema nega a operação e não expõe nenhum dado do recurso solicitado
