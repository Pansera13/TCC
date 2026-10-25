# Spec Delta

## Purpose

Suíte de testes automatizados em pytest-django que verifica a correção funcional do backend Django e prova paridade de contrato com o backend Node/Express, garantindo que o frontend React funcione sem alteração.

## ADDED Requirements

### Requirement: Execução com um único comando

A suíte completa de testes SHALL ser executável com um único comando (`pytest`) a partir do diretório `backend-django/`, sem configuração manual prévia além da instalação de dependências Python, produzindo um relatório de resultado legível (passou/falhou/ignorado por teste).

#### Scenario: Execução bem-sucedida

- **WHEN** o desenvolvedor executa `pytest` no diretório `backend-django/` com banco de teste configurado
- **THEN** todos os testes da suíte são descobertos e executados; o relatório final mostra contagem de aprovações, falhas e tempo total

#### Scenario: Falha sinalizada claramente

- **WHEN** um teste falha
- **THEN** o relatório mostra o nome do teste, o erro e o diff entre esperado e recebido, sem exigir inspeção de logs externos

### Requirement: Cobertura mínima das rotas críticas

A suíte SHALL incluir testes para as seguintes rotas: cadastro e login, middleware de autenticação (token ausente, expirado, conta desativada), todas as operações de produto (listar, criar, editar, arquivar, restaurar, excluir, entrada, retirada), histórico de movimentações com paginação, recuperação de senha (buscar, enviar-código, verificar-código, redefinir-senha), equipe (criar, ativar/desativar, mudar cargo, excluir) e notificações (listar, marcar lidas, dispensar).

#### Scenario: Rota de auth coberta

- **WHEN** a suíte é executada
- **THEN** existem testes que verificam login com credenciais válidas (200), inválidas (401) e conta desativada (403)

#### Scenario: Permissões cobertas

- **WHEN** a suíte é executada
- **THEN** existem testes que verificam que Funcionário recebe 403 em rotas de Sócio e que Sócio recebe 403 em rotas de Administrador

### Requirement: Testes de contrato provam paridade com Node

Os testes de contrato SHALL enviar as mesmas requisições HTTP ao backend Django e verificar que o código de status, os campos presentes na resposta e as mensagens de erro coincidem com o comportamento documentado do backend Node, garantindo que o frontend não precise de alteração.

#### Scenario: Paridade de campos no login

- **WHEN** um teste de contrato chama `POST /api/auth/login` com credenciais válidas
- **THEN** a resposta contém exatamente os campos `token`, `nome`, `role`, `id`, `avatar_url` e `permissoes`, com os tipos corretos

#### Scenario: Paridade em erro de validação

- **WHEN** um teste de contrato chama qualquer endpoint com payload inválido
- **THEN** a resposta tem o mesmo código HTTP e o campo `message` com texto equivalente ao que o backend Node retornaria

#### Scenario: Paridade no isolamento por tenant

- **WHEN** um teste de contrato autentica dois tenants distintos e cada um lista seus produtos
- **THEN** cada resposta contém apenas produtos do próprio tenant, sem vazamento entre eles

### Requirement: Isolamento de banco de dados nos testes

Os testes SHALL usar banco de dados isolado (banco de teste Django ou transações revertidas por teste), sem afetar dados de desenvolvimento ou produção.

#### Scenario: Testes não poluem banco real

- **WHEN** a suíte é executada em modo de teste padrão
- **THEN** nenhum dado de teste é gravado permanentemente no banco Supabase de desenvolvimento ou produção

#### Scenario: Testes independentes entre si

- **WHEN** testes são executados em qualquer ordem
- **THEN** o resultado de cada teste não depende da execução ou ordem dos demais
