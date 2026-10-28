# Spec

## Purpose

Limitar o tamanho do corpo de requisições HTTP no backend StockFlow, rejeitando corpos grandes antes da leitura em memória, com resposta 413 JSON padronizada e log de auditoria.

## Requirements

### Requirement: Verificação antecipada de Content-Length por rota

O backend SHALL verificar o cabeçalho `Content-Length` de toda requisição antes que qualquer view leia o corpo. Quando o valor declarado exceder o limite da rota, o backend SHALL rejeitar a requisição com HTTP 413 e corpo JSON `{"message": "Requisição muito grande.", "limite_bytes": <limite>}`, sem ler o corpo.

Limites por rota:
- `/api/nfe/xml`: `NFE_MAX_SIZE_BYTES` (padrão 2 MB)
- Todas as demais rotas `/api/`: `DATA_UPLOAD_MAX_MEMORY_SIZE` (padrão 64 KB)

#### Scenario: Content-Length acima do limite é rejeitado antes da leitura

- **GIVEN** uma requisição com `Content-Length` declarado acima do limite da rota
- **WHEN** o backend recebe a requisição
- **THEN** retorna HTTP 413 com JSON `{"message": "Requisição muito grande.", "limite_bytes": <n>}` sem processar o corpo

#### Scenario: Content-Length dentro do limite passa normalmente

- **GIVEN** uma requisição com `Content-Length` dentro do limite da rota
- **WHEN** o backend recebe a requisição
- **THEN** a requisição é processada normalmente pela view

### Requirement: Tratamento seguro de Content-Length ausente ou inválido

Quando `Content-Length` estiver ausente, negativo ou não numérico, o backend SHALL aceitar a requisição e aplicar `DATA_UPLOAD_MAX_MEMORY_SIZE` como limite máximo durante a leitura do corpo (enforcement do Django). O servidor SHALL NOT retornar 400 nem rejeitar a requisição antes de tentar lê-la.

#### Scenario: Content-Length ausente não causa erro

- **GIVEN** uma requisição sem cabeçalho `Content-Length`
- **WHEN** o backend recebe a requisição
- **THEN** a requisição é processada (podendo ainda gerar 413 durante leitura se o corpo exceder `DATA_UPLOAD_MAX_MEMORY_SIZE`)

### Requirement: Conversão de exceções de parsing em 413 JSON

Quando o parsing do corpo pelo Django lançar `RequestDataTooBig` ou `TooManyFieldsSent`, o backend SHALL retornar HTTP 413 com JSON `{"message": "Requisição muito grande.", "limite_bytes": <DATA_UPLOAD_MAX_MEMORY_SIZE>}` sem expor traceback ou mensagem interna de exceção.

#### Scenario: Corpo excessivo durante parsing resulta em 413

- **GIVEN** uma requisição sem `Content-Length` cujo corpo real excede `DATA_UPLOAD_MAX_MEMORY_SIZE`
- **WHEN** uma view acessa `request.body` ou `request.POST`
- **THEN** o backend retorna HTTP 413 JSON sem traceback

### Requirement: Respostas 413 com cabeçalhos de segurança e CORS

Todas as respostas HTTP 413 SHALL incluir os mesmos cabeçalhos de segurança das demais respostas (`X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Permissions-Policy`) e os cabeçalhos CORS quando a origem for permitida.

#### Scenario: Resposta 413 tem cabeçalhos de segurança

- **WHEN** o backend retorna HTTP 413
- **THEN** a resposta contém `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` e `Content-Security-Policy`

### Requirement: Log de requisições rejeitadas por tamanho

O backend SHALL registrar um aviso (`WARNING`) no logger `api.limites` (ou `api.middleware`) para cada requisição rejeitada por tamanho, incluindo o IP do cliente, a rota e o tamanho declarado, sem incluir nenhum conteúdo do corpo.

#### Scenario: Rejeição por tamanho gera entrada de log

- **WHEN** uma requisição é rejeitada com 413
- **THEN** o logger registra WARNING com IP, rota e Content-Length declarado

### Requirement: Limites configuráveis por variável de ambiente

Os limites SHALL ser lidos das variáveis de ambiente `DATA_UPLOAD_MAX_MEMORY_SIZE` (padrão 65536 bytes) e `NFE_MAX_SIZE_BYTES` (padrão 2097152 bytes, 2 MB). A variável `DATA_UPLOAD_MAX_NUMBER_FIELDS` (padrão 200) SHALL limitar o número de campos em formulários multipart. Todos SHALL ter fallback para os padrões sem exigir redefinição explícita em desenvolvimento.

#### Scenario: Limites lidos de variáveis de ambiente

- **GIVEN** `DATA_UPLOAD_MAX_MEMORY_SIZE=32768` definido no ambiente
- **WHEN** o backend inicializa
- **THEN** o limite para rotas JSON é 32768 bytes
