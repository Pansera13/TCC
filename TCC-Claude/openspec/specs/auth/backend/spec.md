# Spec: auth/backend

## Purpose

API REST de autenticação do StockFlow: registra usuários, autentica credenciais, emite tokens JWT e gerencia o fluxo de recuperação de senha com código temporário por e-mail.

## Requirements

### Requirement: Rota de cadastro

`POST /api/auth/register` DEVE aceitar nome completo, nome da empresa, CPF ou CNPJ, e-mail, e-mail de recuperação (`email_recuperacao`), sua confirmação (`email_recuperacao_confirmacao`) e senha. Senha DEVE ser armazenada como hash bcrypt. CPF/CNPJ e e-mail DEVEM ser únicos; o e-mail de recuperação PODE se repetir entre contas. O e-mail de recuperação DEVE ser validado conforme a spec `auth/register`. DEVE retornar 201 em sucesso, 400 para e-mail de recuperação inválido ou ausente e 409 em duplicidade.

#### Scenario: Cadastro bem-sucedido

- **WHEN** rota recebe payload válido com dados únicos e e-mail de recuperação válido
- **THEN** retorna HTTP 201 com mensagem de confirmação e usuário salvo no banco com senha_hash e `email_recuperacao`

#### Scenario: E-mail ou CPF/CNPJ duplicado

- **WHEN** rota recebe e-mail ou CPF/CNPJ já existente no banco
- **THEN** retorna HTTP 409 com mensagem indicando o campo duplicado

#### Scenario: E-mail de recuperação inválido

- **WHEN** rota recebe `email_recuperacao` ausente, igual ao e-mail de login, de provedor não permitido ou diferente da confirmação
- **THEN** retorna HTTP 400 com `field` igual a `email_recuperacao` e, quando houver domínio parecido com um permitido, a sugestão de correção

### Requirement: Rota de login

`POST /api/auth/login` DEVE aceitar identificador (nome da empresa, CNPJ ou CPF) e senha. O sistema DEVE detectar o tipo do identificador e buscar no campo correto. Em caso de sucesso DEVE retornar token JWT com expiração de 8 horas. Em caso de falha DEVE retornar 401 com mensagem genérica.

#### Scenario: Login com credenciais válidas

- **WHEN** rota recebe identificador e senha corretos
- **THEN** retorna HTTP 200 com token JWT válido por 8 horas

#### Scenario: Credenciais inválidas

- **WHEN** rota recebe identificador ou senha incorretos
- **THEN** retorna HTTP 401 com mensagem "Usuário ou senha inválidos"

### Requirement: Rotas de recuperação de senha

O backend DEVE expor, sem exigir token de sessão, as rotas `POST /api/auth/recuperacao/buscar`, `POST /api/auth/recuperacao/enviar-codigo`, `POST /api/auth/recuperacao/verificar-codigo` e `POST /api/auth/recuperacao/redefinir-senha`. A busca devolve um token curto e assinado de busca e os dados mascarados; o envio, a verificação e a redefinição exigem esse token (ou o token de redefinição devolvido pela verificação). Os erros DEVEM seguir o comportamento da spec `auth/forgot-password`: 404 conta não encontrada, 403 conta de equipe ou desativada, 422 conta sem e-mail de recuperação, 400 código inválido ou expirado, 429 limite excedido, 502 falha no envio.

#### Scenario: Busca devolve só dados mascarados

- **WHEN** a busca encontra uma conta principal ativa com e-mail de recuperação
- **THEN** responde HTTP 200 com token de busca, nome mascarado e e-mail de recuperação mascarado, sem nenhum dado completo da conta

#### Scenario: Envio sem token de busca

- **WHEN** `enviar-codigo` é chamado sem token de busca válido ou expirado
- **THEN** responde HTTP 401 e não envia e-mail

#### Scenario: Redefinição com token usado

- **WHEN** `redefinir-senha` recebe um token de redefinição cujo código já foi usado ou invalidado
- **THEN** responde HTTP 400 com "Token inválido ou expirado" e não altera a senha

#### Scenario: Redefinição bem-sucedida

- **WHEN** `redefinir-senha` recebe token válido e nova senha com pelo menos 8 caracteres
- **THEN** a senha é atualizada com novo hash bcrypt, o código é invalidado e responde HTTP 200

### Requirement: Middleware de autenticação JWT

O sistema DEVE fornecer middleware que valida o token JWT no header `Authorization: Bearer <token>` para proteger rotas privadas. Rotas sem token válido DEVEM retornar 401. A cada requisição o middleware DEVE conferir no banco que a conta existe e está ativa, e DEVE usar o cargo e o nome atuais do banco (não os do token). Falha ao consultar o banco NÃO DEVE retornar 401: DEVE retornar 503. Rotas que exigem um nível ou permissão específica DEVEM retornar 403 quando o cargo da conta não a possui. O middleware DEVE expor `tenant_id` em `req.user`, carregado do banco a cada requisição, para que todos os endpoints de dados filtrem exclusivamente pelos registros do tenant autenticado.

#### Scenario: Token válido em rota protegida

- **WHEN** requisição inclui token JWT válido no header Authorization e a conta existe e está ativa
- **THEN** middleware permite o acesso e injeta os dados do usuário (incluindo `tenant_id`), com o cargo atual do banco, na requisição

#### Scenario: Token ausente ou inválido

- **WHEN** requisição não inclui token ou inclui token inválido
- **THEN** retorna HTTP 401 com mensagem "Não autorizado"

#### Scenario: Token expirado

- **WHEN** requisição inclui token JWT expirado
- **THEN** retorna HTTP 401 com mensagem "Sua sessão expirou. Entre novamente."

#### Scenario: Conta desativada ou removida

- **WHEN** requisição inclui token válido de uma conta desativada ou removida
- **THEN** retorna HTTP 401 e a conta perde o acesso imediatamente, mesmo com sessão aberta

#### Scenario: Falha temporária do banco

- **WHEN** a consulta da conta ao banco falha
- **THEN** retorna HTTP 503 (e não 401), para a interface não encerrar a sessão por um erro passageiro

#### Scenario: Isolamento de dados entre tenants

- **WHEN** usuário autenticado requisita lista de produtos, movimentações, equipe ou relatórios
- **THEN** sistema retorna apenas registros com `tenant_id` igual ao do usuário autenticado

#### Scenario: Cargo sem permissão para a rota

- **WHEN** uma conta autenticada chama uma rota que exige um nível acima do seu cargo
- **THEN** retorna HTTP 403 com mensagem indicando a falta de permissão

### Requirement: Criação de usuário no painel herda tenant do admin

Ao criar um usuário via painel de equipe, o novo usuário DEVE receber o mesmo `tenant_id` do administrador que o criou, integrando-o à mesma empresa.

#### Scenario: Usuário criado via painel pertence ao mesmo tenant

- **WHEN** admin cria um usuário pelo painel de equipe
- **THEN** o novo usuário compartilha produtos, movimentações e equipe com o admin que o criou
