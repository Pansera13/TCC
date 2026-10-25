# backend/django-runtime Specification

## Purpose
Backend REST do StockFlow implementado em Python + Django REST Framework, conectando ao mesmo banco PostgreSQL no Supabase, mantendo paridade comportamental total com a implementação Node/Express substituída.

## Requirements

### Requirement: Servidor Django na mesma porta

O sistema SHALL expor todos os endpoints da API na mesma URL base (`/api/`) e na porta definida por variável de ambiente (`PORT`, padrão 3001), sem nenhuma alteração nos clientes React existentes além da URL base.

#### Scenario: Mesmas rotas acessíveis

- **WHEN** o cliente React envia uma requisição para qualquer endpoint `/api/...` com os mesmos campos e método HTTP que enviava ao backend Node
- **THEN** o backend Django responde com o mesmo código HTTP, os mesmos campos JSON e a mesma semântica comportamental

#### Scenario: Porta configurável

- **WHEN** a variável de ambiente `PORT` é definida antes de iniciar o servidor
- **THEN** o servidor Django escuta na porta especificada

### Requirement: Mapeamento ORM não-destrutivo

O backend Django SHALL mapear as tabelas `usuarios`, `products`, `movements`, `notificacoes` e `notificacoes_aviso` existentes com `managed = False`, sem criar, alterar ou remover nenhuma tabela, coluna, constraint ou função no banco.

#### Scenario: Nenhuma migration destrutiva ao inicializar

- **WHEN** `manage.py migrate` é executado em banco com o esquema Supabase existente
- **THEN** nenhuma tabela é criada, alterada ou removida; a função `pagar_pedido` permanece intocada

#### Scenario: Dados existentes acessíveis

- **WHEN** o backend Django recebe requisição autenticada
- **THEN** retorna dados já presentes no banco, incluindo usuários, produtos e movimentações criadas pelo backend Node

### Requirement: Compatibilidade de hashes bcrypt existentes

O sistema SHALL autenticar usuários com hashes bcrypt (custo 12) gerados pelo backend Node, sem exigir redefinição de senha ou migração de dados.

#### Scenario: Login com senha antiga

- **WHEN** um usuário cadastrado pelo backend Node faz login com a senha correta
- **THEN** o sistema aceita e retorna token JWT; a senha_hash na tabela não é alterada

#### Scenario: Novo hash ao redefinir senha

- **WHEN** um usuário redefine a senha pelo fluxo de recuperação
- **THEN** o novo hash é gerado com bcrypt custo 12 e salvo; logins futuros usam o novo hash

### Requirement: JWT com releitura de conta do banco

O sistema SHALL emitir tokens JWT com expiração de 8 horas e, a cada requisição autenticada, SHALL reler cargo (`role`), status (`ativo`) e `tenant_id` do banco em vez de confiar no payload do token.

#### Scenario: Token válido, conta ativa

- **WHEN** requisição inclui JWT válido e não expirado de conta ativa
- **THEN** middleware injeta `id`, `tenant_id`, `role` e `nome` com os valores atuais do banco

#### Scenario: Token válido, conta desativada

- **WHEN** a conta associada ao JWT foi desativada desde a emissão do token
- **THEN** middleware responde HTTP 401 imediatamente, sem aguardar o token expirar

#### Scenario: Falha temporária ao consultar o banco

- **WHEN** a query de releitura da conta falha por erro de conexão
- **THEN** middleware responde HTTP 503 (não 401), para o frontend não encerrar a sessão

### Requirement: CORS restrito por variável de ambiente

O sistema SHALL aceitar requisições Cross-Origin apenas de origens definidas pela variável de ambiente `ALLOWED_ORIGINS`; sem a variável, SHALL aceitar localhost e redes privadas (RFC 1918) como o backend Node fazia.

#### Scenario: Origem permitida

- **WHEN** requisição chega de uma origem listada em `ALLOWED_ORIGINS`
- **THEN** resposta inclui headers CORS corretos e o cliente recebe os dados

#### Scenario: Origem bloqueada

- **WHEN** requisição chega de uma origem não listada
- **THEN** servidor responde sem headers CORS e o navegador bloqueia o acesso

### Requirement: Rate limit e respostas de erro padronizadas em JSON

O sistema SHALL aplicar rate limit nas rotas de recuperação de senha com os mesmos limites do backend Node (10 buscas por IP/hora; 3 envios por conta/hora) e SHALL retornar todos os erros HTTP (400, 401, 403, 404, 429, 500, 503) como JSON `{ "message": "..." }` nunca como HTML.

#### Scenario: Erro de validação retorna JSON

- **WHEN** qualquer endpoint retorna status 4xx ou 5xx
- **THEN** o corpo da resposta é JSON com o campo `message` e o Content-Type é `application/json`

#### Scenario: Rate limit de recuperação

- **WHEN** um IP excede 10 buscas de recuperação em uma hora
- **THEN** o servidor responde HTTP 429 com `retry_after` em segundos

### Requirement: Compatibilidade com connection pooler do Supabase

O sistema SHALL configurar `CONN_MAX_AGE = 0` na conexão com o banco, proibindo o reuso de conexões entre requisições. Isso é necessário porque o Supabase PgBouncer opera em modo *transaction pooling* e fecha conexões ociosas após cada transação; reutilizar uma conexão fechada causa erros silenciosos onde dados aparecem em navegação SPA mas somem ao recarregar a página (F5).

#### Scenario: Requisições consecutivas retornam dados consistentes

- **WHEN** o usuário navega entre páginas do SPA e recarrega com F5
- **THEN** todos os endpoints retornam os dados atuais do banco, sem dados aparecendo em navegação interna mas sumindo no reload

#### Scenario: Conexão não reutilizada entre requisições

- **WHEN** `CONN_MAX_AGE` está configurado como `0` nas configurações do Django
- **THEN** cada requisição abre e fecha sua própria conexão com o banco; nenhuma conexão é mantida em pool local pelo Django

### Requirement: Placeholders SQL no formato psycopg2

Todo SQL parametrizado escrito diretamente (fora do ORM Django) SHALL usar a notação `%s` do psycopg2 como placeholder posicional. A notação `$1`, `$2`, `$N` do PostgreSQL nativo e da biblioteca `pg` do Node.js SHALL NOT ser usada, pois causa `ProgrammingError` no psycopg2.

#### Scenario: Query com parâmetros posicionais

- **WHEN** código executa `cursor.execute("SELECT * FROM products WHERE tenant_id = %s AND id = %s", [tid, pid])`
- **THEN** a query é executada corretamente sem erros de placeholder

#### Scenario: Query dinâmica com múltiplos filtros

- **WHEN** a função de movimentações constrói uma query com número variável de filtros usando `%s`
- **THEN** a lista de parâmetros é construída em paralelo com os `%s` e a query é executada sem `ProgrammingError`

### Requirement: Segredos somente em variáveis de ambiente

O sistema SHALL ler `DATABASE_URL` (ou variáveis individuais do Supabase), `JWT_SECRET`, `JWT_RESET_SECRET`, `RESEND_API_KEY`, `RECAPTCHA_SECRET` e `EMAIL_FROM` exclusivamente de variáveis de ambiente, nunca de arquivos versionados. O repositório SHALL incluir `.env.example` com valores fictícios e SHALL manter `.env` no `.gitignore`.

#### Scenario: Inicialização sem .env commitado

- **WHEN** o repositório é clonado e `.env.example` é copiado como `.env` com valores reais
- **THEN** o servidor inicia sem erros de configuração e nenhum segredo está presente no histórico git

#### Scenario: Variável ausente em produção

- **WHEN** uma variável obrigatória está ausente na inicialização
- **THEN** o servidor registra erro claro no log e recusa iniciar (ou responde 503 para a rota dependente)
