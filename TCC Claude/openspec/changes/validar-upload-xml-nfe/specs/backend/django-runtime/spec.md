# Spec Delta

## Purpose

Expande o conjunto de respostas de erro JSON do backend para incluir HTTP 415 e 422, além dos 413 já adicionados pela change `limitar-tamanho-do-corpo`.

## MODIFIED Requirements

### Requirement: Rate limit e respostas de erro padronizadas em JSON

**Replaces:** versão desta spec na change `limitar-tamanho-do-corpo` (acumula o delta)

O sistema SHALL retornar todos os erros HTTP (400, 401, 403, 404, 413, 415, 422, 429, 500, 503) como JSON `{ "message": "..." }`, nunca como HTML. Respostas 413 SHALL incluir adicionalmente `"limite_bytes": <n>`. Respostas 429 SHALL incluir `"retry_after": <n>`.

#### Scenario: 415 retornado como JSON

- **WHEN** uma requisição de upload contém tipo de arquivo não suportado
- **THEN** a resposta é `{"message": "Envie um arquivo no formato .xml."}` com status 415, nunca HTML

#### Scenario: 422 retornado como JSON

- **WHEN** o XML da NF-e excede os limites estruturais
- **THEN** a resposta é `{"message": "NF-e contém muitos itens. Máximo permitido: <n>."}` com status 422, nunca HTML
