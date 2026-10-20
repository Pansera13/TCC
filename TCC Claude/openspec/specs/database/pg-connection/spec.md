# Spec: database/pg-connection

## Purpose

Camada de acesso ao banco de dados do StockFlow usando PostgreSQL (Supabase) via `pg.Pool`, substituindo a dependência MySQL anterior e garantindo conversão correta de tipos numéricos.

## Requirements

### Requirement: Conexão via DATABASE_URL

O sistema DEVE se conectar ao banco Postgres usando exclusivamente a variável de ambiente `DATABASE_URL`. As variáveis `DB_HOST`, `DB_USER`, `DB_PASS` e `DB_NAME` NÃO DEVEM ser usadas. A conexão DEVE usar SSL com `rejectUnauthorized: false` para compatibilidade com o pooler do Supabase.

#### Scenario: Conexão bem-sucedida com DATABASE_URL

- **WHEN** `DATABASE_URL` está definida com uma connection string Supabase válida
- **THEN** o pool se conecta ao banco sem erro e `SELECT 1` retorna resultado

#### Scenario: Nenhum arquivo importa mysql2

- **WHEN** o projeto é inspecionado em busca de `require('mysql2')`
- **THEN** nenhum arquivo retorna resultado

### Requirement: Interface de query unificada

O módulo de banco DEVE exportar uma função `query(sql, params)` que retorna `{ rows, rowCount }`. Todos os placeholders SQL DEVEM usar notação posicional `$1, $2, …`.

#### Scenario: Query com parâmetros posicionais

- **WHEN** código chama `query('SELECT * FROM usuarios WHERE id = $1', [1])`
- **THEN** retorna `{ rows: [...], rowCount: N }`

#### Scenario: INSERT com RETURNING id

- **WHEN** código executa `INSERT INTO products (...) VALUES (...) RETURNING id`
- **THEN** `rows[0].id` contém o id gerado pelo banco

### Requirement: Conversão de NUMERIC para float

O sistema DEVE registrar parser para OID `1700` (NUMERIC) de forma que `quantidade` e `peso_kg` cheguem ao JavaScript como `number`, não como `string`.

#### Scenario: Quantidade retornada como número

- **WHEN** query retorna coluna `quantidade NUMERIC(10,3)`
- **THEN** `row.quantidade` é do tipo JavaScript `number`

#### Scenario: peso_kg nulo não causa erro

- **WHEN** linha tem `peso_kg = NULL`
- **THEN** `row.peso_kg` é `null` (não string)

### Requirement: Script de verificação de conexão

O projeto DEVE incluir `src/testConnection.js` acessível via `npm run test-db` que verifica a conexão e a existência das tabelas `products`, `movements` e `usuarios`, abortando com saída não-zero se falhar.

#### Scenario: Conexão e tabelas válidas

- **WHEN** `npm run test-db` é executado com `DATABASE_URL` válida e tabelas presentes
- **THEN** imprime confirmação e termina com código 0

#### Scenario: Tabela ausente

- **WHEN** uma das tabelas esperadas não existe
- **THEN** imprime aviso descritivo e termina com código não-zero sem tentar criar nada
