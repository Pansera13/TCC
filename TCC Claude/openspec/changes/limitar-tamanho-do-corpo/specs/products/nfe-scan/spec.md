# Spec Delta

## Purpose

Atualiza a verificação de tamanho da importação de NF-e: resposta padronizada 413 (em vez de 400), formato de erro consistente com o restante da API, e rejeição por meio do middleware de Content-Length antes da leitura do corpo.

## MODIFIED Requirements

### Requirement: Upload de arquivo XML de NF-e

**Replaces:** "Upload de arquivo XML de NF-e" (spec base)

O sistema SHALL permitir que o usuário selecione e envie um arquivo `.xml` de NF-e pelo modal de adição de produtos. O backend SHALL processar o arquivo com parser seguro (`defusedxml`), sem processar entidades externas.

Quando o arquivo enviado via multipart (`request.FILES['arquivo']`) tiver tamanho declarado acima de `NFE_MAX_SIZE_BYTES` (padrão 2 MB), o backend SHALL retornar HTTP 413 com JSON `{"message": "Requisição muito grande.", "limite_bytes": <NFE_MAX_SIZE_BYTES>}` sem ler o conteúdo do arquivo.

Quando o corpo XML bruto (sem multipart) tiver `Content-Length` acima de `NFE_MAX_SIZE_BYTES`, o middleware de Content-Length SHALL rejeitar a requisição com 413 antes de a view ser chamada.

#### Scenario: Arquivo multipart acima do limite retorna 413

- **GIVEN** upload multipart com `arquivo.size > NFE_MAX_SIZE_BYTES`
- **WHEN** o backend recebe a requisição
- **THEN** retorna HTTP 413 com `{"message": "Requisição muito grande.", "limite_bytes": <n>}` sem ler o conteúdo do arquivo

#### Scenario: Arquivo multipart dentro do limite é processado

- **GIVEN** upload multipart com `arquivo.size <= NFE_MAX_SIZE_BYTES`
- **WHEN** o backend recebe a requisição
- **THEN** o arquivo é lido e processado normalmente

#### Scenario: Corpo XML bruto acima do limite (via Content-Length) retorna 413

- **GIVEN** requisição POST com body XML e `Content-Length > NFE_MAX_SIZE_BYTES`
- **WHEN** o backend recebe a requisição
- **THEN** retorna HTTP 413 antes da view ler o corpo
