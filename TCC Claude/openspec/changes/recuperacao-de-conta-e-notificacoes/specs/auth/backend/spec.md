# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Rota de solicitação de recuperação de senha

**Reason**: A rota `POST /api/auth/forgot-password` já não existe no código e o fluxo foi redesenhado em passos (busca, envio, verificação, redefinição).
**Migration**: Use `POST /api/auth/recuperacao/buscar` e `POST /api/auth/recuperacao/enviar-codigo`.

### Requirement: Rota de verificação de código

**Reason**: A rota `POST /api/auth/verify-code` já não existe no código e a verificação passou a ter limite de tentativas e token de redefinição ligado ao código.
**Migration**: Use `POST /api/auth/recuperacao/verificar-codigo`.

### Requirement: Rota de redefinição de senha

**Reason**: A rota `POST /api/auth/reset-password` já não existe no código e a redefinição passou a exigir o token de redefinição de uso único.
**Migration**: Use `POST /api/auth/recuperacao/redefinir-senha`.
