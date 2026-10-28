# Spec Delta

## MODIFIED Requirements

### Requirement: Rota de cadastro

`POST /api/auth/register` DEVE aceitar nome completo, nome da empresa, CPF ou CNPJ, e-mail, e-mail de recuperação (`email_recuperacao`), sua confirmação (`email_recuperacao_confirmacao`) e senha. Senha DEVE ser armazenada como hash bcrypt. CPF/CNPJ e e-mail DEVEM ser únicos; o e-mail de recuperação PODE se repetir entre contas. O e-mail de recuperação DEVE ser validado conforme a spec `auth/register`. DEVE retornar 201 em sucesso, 400 para e-mail de recuperação inválido ou ausente, 409 em duplicidade e 429 quando o IP exceder o limite de tentativas.

#### Scenario: Cadastro bem-sucedido

- **WHEN** rota recebe payload válido com dados únicos e e-mail de recuperação válido
- **THEN** retorna HTTP 201 com mensagem de confirmação e usuário salvo no banco com senha_hash e `email_recuperacao`

#### Scenario: E-mail ou CPF/CNPJ duplicado

- **WHEN** rota recebe e-mail ou CPF/CNPJ já existente no banco
- **THEN** retorna HTTP 409 com mensagem indicando o campo duplicado

#### Scenario: E-mail de recuperação inválido

- **WHEN** rota recebe `email_recuperacao` ausente, igual ao e-mail de login, de provedor não permitido ou diferente da confirmação
- **THEN** retorna HTTP 400 com `field` igual a `email_recuperacao` e, quando houver domínio parecido com um permitido, a sugestão de correção

#### Scenario: IP excede limite de cadastros

- **WHEN** o mesmo IP realiza mais tentativas de cadastro do que o limite configurado na janela de tempo
- **THEN** retorna HTTP 429 com `{"message": "Muitas tentativas. Tente novamente mais tarde.", "retry_after": <segundos>}` e cabeçalho `Retry-After`

### Requirement: Rota de login

`POST /api/auth/login` DEVE aceitar identificador (nome da empresa, CNPJ, CPF ou e-mail) e senha. O sistema DEVE detectar o tipo do identificador e buscar no campo correto. Em caso de sucesso DEVE retornar token JWT com expiração de 8 horas. Em caso de falha DEVE retornar 401 com mensagem genérica. Após exceder o limite de tentativas por IP ou por identificador, DEVE retornar 429 antes de processar as credenciais.

#### Scenario: Login com credenciais válidas

- **WHEN** rota recebe identificador e senha corretos
- **THEN** retorna HTTP 200 com token JWT válido por 8 horas

#### Scenario: Credenciais inválidas

- **WHEN** rota recebe identificador ou senha incorretos
- **THEN** retorna HTTP 401 com mensagem "Usuário ou senha inválidos"

#### Scenario: IP bloqueado por excesso de falhas

- **WHEN** o IP do cliente excedeu o limite de falhas de login na janela configurada
- **THEN** retorna HTTP 429 com `retry_after` real e cabeçalho `Retry-After`, sem consultar o banco

#### Scenario: Identificador bloqueado por excesso de falhas

- **WHEN** o identificador (normalizado) excedeu o limite de falhas na janela configurada
- **THEN** retorna HTTP 429 com `retry_after` real e cabeçalho `Retry-After`, sem consultar o banco

#### Scenario: Identificador inexistente retorna mesmo erro que senha errada

- **WHEN** rota recebe um identificador que não existe no banco
- **THEN** retorna HTTP 401 com a mesma mensagem de "Usuário ou senha inválidos" e incrementa o contador do identificador para o rate limit
