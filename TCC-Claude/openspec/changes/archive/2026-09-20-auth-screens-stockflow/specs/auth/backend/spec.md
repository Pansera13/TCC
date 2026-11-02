# Spec Delta

## Purpose

API REST de autenticação do StockFlow: registra usuários, autentica credenciais, emite tokens JWT e gerencia o fluxo de recuperação de senha com código temporário por e-mail.

## ADDED Requirements

### Requirement: Rota de cadastro

`POST /api/auth/register` DEVE aceitar nome completo, nome da empresa, CPF ou CNPJ, e-mail e senha. Senha DEVE ser armazenada como hash bcrypt. CPF/CNPJ e e-mail DEVEM ser únicos. DEVE retornar 201 em sucesso ou 409 em duplicidade.

#### Scenario: Cadastro bem-sucedido

- **WHEN** rota recebe payload válido com dados únicos
- **THEN** retorna HTTP 201 com mensagem de confirmação e usuário salvo no banco com senha_hash

#### Scenario: E-mail ou CPF/CNPJ duplicado

- **WHEN** rota recebe e-mail ou CPF/CNPJ já existente no banco
- **THEN** retorna HTTP 409 com mensagem indicando o campo duplicado

### Requirement: Rota de login

`POST /api/auth/login` DEVE aceitar identificador (nome da empresa, CNPJ ou CPF) e senha. O sistema DEVE detectar o tipo do identificador e buscar no campo correto. Em caso de sucesso DEVE retornar token JWT com expiração de 8 horas. Em caso de falha DEVE retornar 401 com mensagem genérica.

#### Scenario: Login com credenciais válidas

- **WHEN** rota recebe identificador e senha corretos
- **THEN** retorna HTTP 200 com token JWT válido por 8 horas

#### Scenario: Credenciais inválidas

- **WHEN** rota recebe identificador ou senha incorretos
- **THEN** retorna HTTP 401 com mensagem "Usuário ou senha inválidos"

### Requirement: Rota de solicitação de recuperação de senha

`POST /api/auth/forgot-password` DEVE aceitar e-mail e CPF/CNPJ, verificar se correspondem ao mesmo cadastro, gerar código de 6 dígitos com validade de 15 minutos e enviar por e-mail. DEVE retornar 200 mesmo quando os dados não são encontrados (para não revelar cadastros).

#### Scenario: Dados encontrados

- **WHEN** rota recebe e-mail e CPF/CNPJ de um cadastro existente
- **THEN** gera código de 6 dígitos, salva com expiração de 15 minutos e envia e-mail com o código, retornando HTTP 200

#### Scenario: Dados não encontrados

- **WHEN** rota recebe combinação de e-mail e CPF/CNPJ sem correspondência
- **THEN** retorna HTTP 200 sem revelar que os dados não existem

### Requirement: Rota de verificação de código

`POST /api/auth/verify-code` DEVE aceitar e-mail e código, validar se o código está correto e não expirado. DEVE retornar token temporário de redefinição em caso de sucesso.

#### Scenario: Código válido

- **WHEN** rota recebe e-mail e código correto dentro do prazo de 15 minutos
- **THEN** retorna HTTP 200 com token temporário de redefinição

#### Scenario: Código inválido ou expirado

- **WHEN** rota recebe código errado ou expirado
- **THEN** retorna HTTP 400 com mensagem "Código inválido ou expirado"

### Requirement: Rota de redefinição de senha

`POST /api/auth/reset-password` DEVE aceitar token temporário e nova senha, validar o token, atualizar a senha com novo hash bcrypt e invalidar o código usado.

#### Scenario: Redefinição bem-sucedida

- **WHEN** rota recebe token temporário válido e nova senha
- **THEN** senha é atualizada com novo hash bcrypt, código é invalidado e retorna HTTP 200

#### Scenario: Token inválido

- **WHEN** rota recebe token temporário inválido ou já utilizado
- **THEN** retorna HTTP 400 com mensagem "Token inválido ou expirado"

### Requirement: Middleware de autenticação JWT

O sistema DEVE fornecer middleware que valida o token JWT no header `Authorization: Bearer <token>` para proteger rotas privadas. Rotas sem token válido DEVEM retornar 401.

#### Scenario: Token válido em rota protegida

- **WHEN** requisição inclui token JWT válido no header Authorization
- **THEN** middleware permite o acesso e injeta os dados do usuário na requisição

#### Scenario: Token ausente ou inválido

- **WHEN** requisição não inclui token ou inclui token inválido/expirado
- **THEN** retorna HTTP 401 com mensagem "Não autorizado"
