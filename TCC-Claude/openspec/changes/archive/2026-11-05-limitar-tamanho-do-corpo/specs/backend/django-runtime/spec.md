# Spec Delta

## Purpose

Expande o conjunto de respostas de erro JSON do backend para incluir HTTP 413.

## MODIFIED Requirements

### Requirement: Rate limit e respostas de erro padronizadas em JSON

**Replaces:** "Rate limit e respostas de erro padronizadas em JSON" (spec base)

O sistema SHALL aplicar rate limit nas rotas de recuperação de senha com os mesmos limites do backend Node (10 buscas por IP/hora; 3 envios por conta/hora) e SHALL retornar todos os erros HTTP (400, 401, 403, 404, 413, 429, 500, 503) como JSON `{ "message": "..." }` nunca como HTML. Respostas 413 SHALL incluir adicionalmente o campo `"limite_bytes": <n>`.

#### Scenario: 413 retornado como JSON

- **WHEN** uma requisição excede o limite de tamanho
- **THEN** a resposta é `{"message": "Requisição muito grande.", "limite_bytes": <n>}` com status 413, nunca HTML
