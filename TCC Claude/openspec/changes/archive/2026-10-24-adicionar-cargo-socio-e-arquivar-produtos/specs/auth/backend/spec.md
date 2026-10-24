## MODIFIED Requirements

### Requirement: Middleware de autenticação JWT

O sistema DEVE fornecer middleware que valida o token JWT no header `Authorization: Bearer <token>` para proteger rotas privadas. Rotas sem token válido DEVEM retornar 401. A cada requisição o middleware DEVE conferir no banco que a conta existe e está ativa, e DEVE usar o cargo e o nome atuais do banco (não os do token). Falha ao consultar o banco NÃO DEVE retornar 401: DEVE retornar 503. Rotas que exigem um nível ou permissão específica DEVEM retornar 403 quando o cargo da conta não a possui.

#### Scenario: Token válido em rota protegida

- **WHEN** requisição inclui token JWT válido no header Authorization e a conta existe e está ativa
- **THEN** middleware permite o acesso e injeta os dados do usuário, com o cargo atual do banco, na requisição

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

#### Scenario: Cargo sem permissão para a rota

- **WHEN** uma conta autenticada chama uma rota que exige um nível acima do seu cargo
- **THEN** retorna HTTP 403 com mensagem indicando a falta de permissão
