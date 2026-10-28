# Spec Delta

## Purpose

Cabeçalhos HTTP de segurança emitidos pelo backend Django da API do StockFlow, cobrindo proteção contra clickjacking, sniffing de MIME type, política de referrer, Content Security Policy, Permissions Policy e transporte seguro em produção.

## ADDED Requirements

### Requirement: Cabeçalhos de segurança básicos em todas as respostas

Toda resposta da API (incluindo erros 4xx/5xx e respostas 429) SHALL incluir:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `X-Frame-Options: DENY`

Esses cabeçalhos SHALL estar presentes independentemente de `DEBUG` ser `True` ou `False`.

#### Scenario: Resposta de sucesso traz os três cabeçalhos básicos

- **WHEN** cliente faz requisição a qualquer endpoint da API
- **THEN** a resposta contém `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin` e `X-Frame-Options: DENY`

#### Scenario: Respostas de erro também trazem os cabeçalhos

- **WHEN** a API retorna HTTP 401, 403, 404 ou 429
- **THEN** a resposta contém os mesmos três cabeçalhos básicos

### Requirement: Content-Security-Policy restritiva para a API

Toda resposta da API SHALL incluir o cabeçalho `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`. A API serve exclusivamente JSON; bloquear todo conteúdo por padrão é o comportamento correto e não afeta os clientes React (que consomem JSON, não a CSP da API).

#### Scenario: CSP presente em resposta JSON

- **WHEN** cliente faz requisição a um endpoint que retorna JSON
- **THEN** a resposta contém `Content-Security-Policy` com `default-src 'none'` e `frame-ancestors 'none'`

### Requirement: Permissions-Policy mínima

Toda resposta da API SHALL incluir `Permissions-Policy: camera=(), microphone=(), geolocation=()`, desabilitando essas features para o contexto da API. O frontend React usa a câmera no próprio documento (navegador) e não é afetado pela política da API.

#### Scenario: Permissions-Policy presente nas respostas

- **WHEN** cliente faz requisição a qualquer endpoint
- **THEN** a resposta contém `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### Requirement: Configuração segura de DEBUG e ALLOWED_HOSTS

O backend SHALL usar `DEBUG=False` como padrão quando a variável de ambiente `DEBUG` não está definida. O backend SHALL ler `ALLOWED_HOSTS` de variável de ambiente (lista separada por vírgula); quando a variável não está definida, o padrão SHALL ser `['localhost', '127.0.0.1']`. O valor `'*'` NÃO SHALL ser aceito.

#### Scenario: DEBUG padrão é False

- **WHEN** a variável de ambiente `DEBUG` não está definida
- **THEN** o backend opera com `DEBUG=False`

#### Scenario: Host não permitido recebe 400

- **WHEN** uma requisição chega com `Host` que não está em `ALLOWED_HOSTS`
- **THEN** o backend retorna HTTP 400

#### Scenario: Wildcard não aceito

- **WHEN** `ALLOWED_HOSTS` é configurado com `['*']`
- **THEN** o backend rejeita a configuração (nunca define `['*']` internamente)

### Requirement: Modo produção com HSTS, SSL redirect e cookies seguros

Quando `DEBUG=False`, o backend SHALL:
- Redirecionar permanentemente (HTTP 301) requisições HTTP para HTTPS.
- Emitir `Strict-Transport-Security` com `max-age` configurável pela variável `SECURE_HSTS_SECONDS` (padrão 300 segundos para teste inicial; documentar subida gradual até 31536000 em produção consolidada) e `includeSubDomains`.
- Usar `SESSION_COOKIE_SECURE=True` e `CSRF_COOKIE_SECURE=True`.

Quando `DEBUG=True`, nenhuma dessas configurações SHALL estar ativa, para não quebrar o desenvolvimento em `localhost`.

#### Scenario: HTTP redireciona para HTTPS em produção

- **WHEN** `DEBUG=False` e chega requisição HTTP sem flag de HTTPS
- **THEN** o backend retorna HTTP 301 apontando para o mesmo caminho em HTTPS

#### Scenario: HSTS presente em requisição HTTPS em produção

- **WHEN** `DEBUG=False` e a requisição chega via HTTPS
- **THEN** a resposta contém `Strict-Transport-Security` com `max-age` igual ao valor configurado

#### Scenario: Sem HSTS nem SSL redirect em desenvolvimento

- **WHEN** `DEBUG=True`
- **THEN** requisições HTTP são atendidas normalmente e `Strict-Transport-Security` não está presente

### Requirement: Suporte a proxy reverso para HTTPS

Quando a variável de ambiente `TRUSTED_PROXY=true`, o backend SHALL reconhecer o cabeçalho `X-Forwarded-Proto: https` como indicação de conexão segura, permitindo que HSTS e cookies seguros funcionem atrás de um proxy reverso (nginx, Cloudflare, etc.). Quando `TRUSTED_PROXY` não está definido ou é `false`, esse cabeçalho SHALL ser ignorado para determinar a segurança da conexão.

**AVISO:** `TRUSTED_PROXY=true` só deve ser ativado quando há um proxy reverso confiável na frente do servidor. Sem ele, qualquer cliente pode forjar `X-Forwarded-Proto` e contornar a verificação de HTTPS.

#### Scenario: Proxy confiável reconhece X-Forwarded-Proto

- **WHEN** `TRUSTED_PROXY=true` e a requisição inclui `X-Forwarded-Proto: https`
- **THEN** o backend trata a conexão como segura (HSTS emitido, cookies seguros)

#### Scenario: Sem proxy confiável, X-Forwarded-Proto é ignorado

- **WHEN** `TRUSTED_PROXY=false` e a requisição inclui `X-Forwarded-Proto: https`
- **THEN** o backend NÃO trata a conexão como segura com base nesse cabeçalho

### Requirement: CORS não afetado pelos novos cabeçalhos

Os cabeçalhos CORS existentes (`Access-Control-Allow-Origin`, etc.) SHALL continuar funcionando corretamente com as origens configuradas, mesmo com os novos middlewares de segurança na pilha. Requisições `OPTIONS` de preflight SHALL continuar retornando os cabeçalhos CORS sem interferência.

#### Scenario: Requisição de origem permitida continua funcionando

- **WHEN** cliente de origem permitida faz requisição após adição dos middlewares de segurança
- **THEN** a resposta inclui tanto os cabeçalhos CORS quanto os cabeçalhos de segurança

#### Scenario: Preflight OPTIONS com cabeçalhos de segurança

- **WHEN** browser envia requisição OPTIONS de preflight
- **THEN** resposta inclui os cabeçalhos CORS esperados e também os cabeçalhos de segurança básicos
