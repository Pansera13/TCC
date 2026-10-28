# Spec Delta

## Purpose

Expande a validação do upload de NF-e para cobrir tamanho (com resposta correta antes da leitura), extensão, nome do arquivo, Content-Type, conteúdo real, limites estruturais, rate limit e auditoria. O formato de sucesso `{produtos, chNFe}` não muda.

## MODIFIED Requirements

### Requirement: Upload de arquivo XML de NF-e

**Replaces:** "Upload de arquivo XML de NF-e" (spec base `products/nfe-scan`)

O sistema SHALL permitir que o usuário selecione e envie um arquivo `.xml` de NF-e. O backend SHALL aplicar as seguintes validações em sequência, retornando o primeiro erro encontrado sem processar etapas seguintes:

**Verificação de tamanho:**
- Para upload multipart (`request.FILES['arquivo']`): o backend SHALL checar `arquivo.size` ANTES de ler o conteúdo. Se `arquivo.size > NFE_MAX_SIZE_BYTES`, SHALL retornar HTTP 413 com `{"message": "Arquivo muito grande. Máximo: <n> KB.", "limite_bytes": <NFE_MAX_SIZE_BYTES>}`.
- Para corpo bruto (sem multipart): o corpo SHALL ser lido com o limite `DATA_UPLOAD_MAX_MEMORY_SIZE` (Django); se exceder, resulta em HTTP 413.

**Verificação de extensão e nome:**
- O backend SHALL aceitar somente nomes cujo último componente termine em `.xml` (insensível a maiúsculas), usando `os.path.basename` para remover caminhos. SHALL rejeitar nomes que contenham bytes nulos, barras, `..` ou uma extensão interna (ex.: `nota.exe.xml`). Resposta: HTTP 415 com `{"message": "Envie um arquivo no formato .xml."}`.

**Verificação de Content-Type:**
- O backend SHALL aceitar os Content-Types: `application/xml`, `text/xml`, `application/octet-stream`. Demais tipos SHALL ser recusados com HTTP 415 e `{"message": "Envie um arquivo no formato .xml."}`. Esta verificação é um filtro adicional: o Content-Type é declarado pelo cliente e não é garantia de conteúdo.

**Verificação do conteúdo (sniff):**
- Após remoção de BOM (UTF-8, UTF-16) e espaços iniciais, o primeiro byte SHALL ser `<`. Arquivos binários ou HTML que não comecem com `<` SHALL ser recusados com HTTP 415 e `{"message": "Envie um arquivo no formato .xml."}`.

**Parse seguro:**
- O backend SHALL usar `defusedxml.ElementTree.fromstring` para parsear o XML. SHALL capturar `ET.ParseError`, `defusedxml.DTDForbidden`, `defusedxml.EntitiesForbidden` e qualquer outra exceção do parser. Resposta: HTTP 400 com `{"message": "O arquivo não é um XML válido."}` sem vazar mensagem interna de exceção ou traceback.

#### Scenario: Arquivo válido é aceito
- **WHEN** o usuário envia `nota.xml` com conteúdo XML de NF-e válido dentro do limite de tamanho
- **THEN** o backend processa e retorna `{produtos, chNFe}` com HTTP 200

#### Scenario: Arquivo acima do limite retorna 413 sem ler o conteúdo
- **WHEN** upload multipart com `arquivo.size > NFE_MAX_SIZE_BYTES`
- **THEN** retorna HTTP 413 com `{"message": "Arquivo muito grande. Máximo: <n> KB.", "limite_bytes": <n>}` sem ler o conteúdo

#### Scenario: Extensão errada retorna 415
- **WHEN** o arquivo se chama `nota.txt`, `nota.exe`, `nota.xml.exe` ou `nota.PDF`
- **THEN** retorna HTTP 415 com `{"message": "Envie um arquivo no formato .xml."}`

#### Scenario: Extensão `.xml` maiúsculo é aceito
- **WHEN** o arquivo se chama `NOTA.XML`
- **THEN** a validação de extensão passa (equivalente a `.xml` minúsculo)

#### Scenario: Nome com path traversal ou byte nulo é rejeitado
- **WHEN** o nome do arquivo contém `../`, `/`, `\\` ou byte nulo
- **THEN** retorna HTTP 415

#### Scenario: Content-Type image/png retorna 415
- **WHEN** upload com `Content-Type: image/png`
- **THEN** retorna HTTP 415

#### Scenario: Content-Type application/octet-stream com XML válido é aceito
- **WHEN** upload com `Content-Type: application/octet-stream` e conteúdo XML válido
- **THEN** a validação de Content-Type passa

#### Scenario: Arquivo .xml com conteúdo binário retorna 415
- **WHEN** arquivo nomeado `nota.xml` cujo conteúdo começa com bytes não-XML
- **THEN** retorna HTTP 415

#### Scenario: XML com entidade externa (XXE) é recusado
- **WHEN** XML contém referência a entidade externa ou DTD com entidade
- **THEN** defusedxml bloqueia; retorna HTTP 400 com `{"message": "O arquivo não é um XML válido."}`

### Requirement: Limites estruturais da NF-e

O backend SHALL rejeitar XMLs que excedam `NFE_MAX_ITENS` elementos `<det>` (padrão 500, configurável via variável de ambiente `NFE_MAX_ITENS`) com HTTP 422 e `{"message": "NF-e contém muitos itens. Máximo permitido: <NFE_MAX_ITENS>."}`. Essa verificação SHALL ocorrer após o parse completo.

#### Scenario: NF-e com mais de NFE_MAX_ITENS itens retorna 422
- **GIVEN** `NFE_MAX_ITENS=10` (configurado para o teste)
- **WHEN** XML contém 11 ou mais elementos `<det>`
- **THEN** retorna HTTP 422 com mensagem indicando o limite

#### Scenario: NF-e dentro do limite de itens é aceito
- **GIVEN** `NFE_MAX_ITENS=500`
- **WHEN** XML contém 1 elemento `<det>` válido
- **THEN** processado normalmente

### Requirement: Rate limit de importações de NF-e

O backend SHALL limitar o número de importações por usuário autenticado e por IP. Limites padrão: `NFE_MAX_IMPORTACOES` tentativas em `NFE_JANELA_SEGUNDOS` segundos, com bloqueio de `NFE_BLOQUEIO_SEGUNDOS` (padrões: 20/600/600). Quando o limite é atingido, SHALL retornar HTTP 429 com `{"message": "Muitas tentativas. Tente novamente mais tarde.", "retry_after": <n>}` e cabeçalho `Retry-After`. Os contadores SHALL usar o módulo `api/limites.py` com chaves `nfe:user:<user_id>` e `nfe:ip:<ip>`. O rate limit SHALL ser verificado após a validação de permissão e antes de qualquer processamento do arquivo.

#### Scenario: Excesso de importações retorna 429
- **GIVEN** `NFE_MAX_IMPORTACOES=3` e 3 importações já feitas dentro da janela
- **WHEN** o usuário tenta uma 4ª importação
- **THEN** retorna HTTP 429 com `retry_after` e cabeçalho `Retry-After`

### Requirement: Auditoria de rejeições de upload

O backend SHALL registrar um WARNING no logger `api.nfe` para cada requisição rejeitada, incluindo: motivo da rejeição (413, 415, 422, 429), IP do cliente (via `ip_do_cliente`), `user_id` e `tenant_id` do usuário autenticado. O log SHALL NOT incluir nome do arquivo, conteúdo do arquivo nem dados pessoais além do user_id.

#### Scenario: Rejeição gera log

- **WHEN** qualquer validação de upload falha (413, 415, 422, 429)
- **THEN** o logger `api.nfe` emite WARNING com motivo, IP, user_id e tenant_id
