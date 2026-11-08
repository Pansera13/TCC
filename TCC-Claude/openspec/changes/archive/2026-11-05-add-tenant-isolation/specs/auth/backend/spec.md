# Spec Delta

## MODIFIED Requirements

### Requirement: Middleware de autenticação JWT

O sistema DEVE fornecer middleware que valida o token JWT no header `Authorization: Bearer <token>` para proteger rotas privadas. Rotas sem token válido DEVEM retornar 401. O middleware DEVE expor `tenant_id` em `req.user`, carregado do banco a cada requisição, para que todos os endpoints de dados filtrem exclusivamente pelos registros do tenant autenticado.

#### Scenario: Token válido em rota protegida

- **WHEN** requisição inclui token JWT válido no header Authorization
- **THEN** middleware permite o acesso e injeta os dados do usuário (incluindo `tenant_id`) na requisição

#### Scenario: Token ausente ou inválido

- **WHEN** requisição não inclui token ou inclui token inválido/expirado
- **THEN** retorna HTTP 401 com mensagem "Não autorizado"

#### Scenario: Isolamento de dados entre tenants

- **WHEN** usuário autenticado requisita lista de produtos, movimentações, equipe ou relatórios
- **THEN** sistema retorna apenas registros com `tenant_id` igual ao do usuário autenticado

## ADDED Requirements

### Requirement: Criação de usuário no painel herda tenant do admin

Ao criar um usuário via painel de equipe, o novo usuário DEVE receber o mesmo `tenant_id` do administrador que o criou, integrando-o à mesma empresa.

#### Scenario: Usuário criado via painel pertence ao mesmo tenant

- **WHEN** admin cria um usuário pelo painel de equipe
- **THEN** o novo usuário compartilha produtos, movimentações e equipe com o admin que o criou
