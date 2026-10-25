# Spec: products/nfe-scan

## Purpose

Importa produtos ao estoque a partir de um arquivo XML de Nota Fiscal Eletrônica (NF-e), com validação de duplicatas pela chave de acesso (`chNFe`) e empilhamento de quantidade para produtos com mesmo nome já cadastrados.

## Requirements

### Requirement: Upload de arquivo XML de NF-e
O sistema SHALL permitir que o usuário selecione e envie um arquivo `.xml` de NF-e pelo modal de adição de produtos. O backend SHALL processar o arquivo com parser seguro (`defusedxml`), sem processar entidades externas, com limite de tamanho de 2 MB.

#### Scenario: Arquivo XML válido enviado
- **WHEN** o usuário seleciona um arquivo `.xml` de NF-e válido e confirma
- **THEN** o backend extrai os produtos da nota e retorna a lista com nome, quantidade e unidade de cada item, juntamente com a `chNFe` da nota

#### Scenario: Arquivo maior que 2 MB
- **WHEN** o arquivo enviado excede 2 MB
- **THEN** o backend responde HTTP 400 com mensagem de limite de tamanho

#### Scenario: XML inválido ou sem infNFe
- **WHEN** o arquivo não é um XML válido ou não contém o elemento `infNFe`
- **THEN** o backend responde HTTP 400 ou 422 com mensagem descritiva e nenhum produto é importado

#### Scenario: XML sem produtos com quantidade positiva
- **WHEN** o XML é válido mas nenhum item `<det>` tem `qCom` ou `qTrib` maior que zero
- **THEN** o backend responde HTTP 422 com mensagem "Nenhum produto encontrado no XML."

### Requirement: Extração da chave de acesso (chNFe)
O backend SHALL extrair a chave de 44 dígitos a partir do elemento `<chNFe>` dentro de `infNFe`, ou do atributo `Id` do elemento `infNFe` (formato `NFe` + 44 dígitos). A chave SHALL ser incluída na resposta como `chNFe`.

#### Scenario: chNFe no elemento filho
- **WHEN** `infNFe` contém `<chNFe>44digitosaqui</chNFe>`
- **THEN** o backend retorna `{ "produtos": [...], "chNFe": "44digitosaqui" }`

#### Scenario: chNFe no atributo Id
- **WHEN** `infNFe` tem `Id="NFe44digitosaqui"` e não há elemento `<chNFe>`
- **THEN** o backend extrai os 44 dígitos do atributo e retorna na resposta

### Requirement: Deduplicação por chNFe
O backend SHALL verificar, antes de retornar os produtos, se já existe alguma movimentação do mesmo tenant com `detalhes->>'nfe_chave'` igual à `chNFe` da nota. Se sim, SHALL rejeitar a importação.

#### Scenario: Mesma NF-e importada duas vezes
- **WHEN** o usuário tenta importar um XML cujo `chNFe` já consta em movimentações do tenant
- **THEN** o backend responde HTTP 409 com "Esta NF-e já foi importada anteriormente." e nenhum produto é adicionado

#### Scenario: Primeira importação da nota
- **WHEN** a `chNFe` não existe em nenhuma movimentação do tenant
- **THEN** o backend retorna os produtos normalmente e a importação pode prosseguir

### Requirement: Empilhamento de quantidade para produto já existente
Quando o frontend confirma a importação de um produto da NF-e e já existe produto ativo no tenant com o mesmo nome (comparação sem diferenciação de maiúsculas/minúsculas), o backend SHALL somar a quantidade ao produto existente em vez de criar um registro duplicado. A operação SHALL usar `SELECT FOR UPDATE` dentro de uma transação atômica.

#### Scenario: Produto com mesmo nome já cadastrado
- **WHEN** o frontend envia `POST /api/products` com `nfe_chave` preenchida e já existe produto ativo com nome idêntico (case-insensitive)
- **THEN** o backend acrescenta a quantidade ao produto existente, registra movimentação de entrada com `detalhes.nfe_chave` e responde HTTP 201

#### Scenario: Produto novo (sem correspondência de nome)
- **WHEN** o frontend envia `POST /api/products` com `nfe_chave` preenchida e não existe produto com mesmo nome
- **THEN** o backend cria produto novo, registra movimentação de entrada e responde HTTP 201

### Requirement: Tela de confirmação antes de importar
O sistema SHALL exibir todos os produtos extraídos do XML para revisão antes de qualquer adição ao estoque. O usuário SHALL poder confirmar ou cancelar a importação inteira.

#### Scenario: Usuário confirma importação
- **WHEN** o usuário revisa a lista de produtos extraídos e clica em "Confirmar e Adicionar"
- **THEN** o sistema envia um `POST /api/products` por produto, com o `chNFe` propagado em cada requisição, e fecha o modal após o último produto ser processado

#### Scenario: Usuário cancela importação
- **WHEN** o usuário clica em "Cancelar" na tela de confirmação
- **THEN** nenhum produto é adicionado e o modal fecha sem registrar nenhuma movimentação
