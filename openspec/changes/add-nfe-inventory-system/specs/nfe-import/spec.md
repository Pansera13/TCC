## Purpose

A partir da chave de acesso de uma NFC-e, obter os dados da nota, extrair a lista de produtos com quantidades e valores e lançar a entrada desses itens no estoque de forma automática e sem duplicar notas já importadas.

## ADDED Requirements

### Requirement: Importação da nota a partir da chave de acesso
O sistema SHALL, dada uma chave de acesso de NFC-e válida, obter os dados da nota da fonte configurada, extrair os itens (descrição, GTIN quando disponível, quantidade, unidade e valor) e registrar a nota vinculada à conta do usuário.

#### Scenario: Importação bem-sucedida
- **WHEN** o usuário confirma a importação de uma chave de acesso válida cujos dados são obtidos com sucesso
- **THEN** o sistema registra a nota e cada item extraído, e lança a entrada de estoque correspondente às quantidades da nota

#### Scenario: Nota não localizada ou dados indisponíveis
- **WHEN** a fonte de dados não retorna a nota (chave inexistente, indisponibilidade temporária ou dados incompletos)
- **THEN** o sistema não altera o estoque, informa o motivo da falha e permite que o usuário tente novamente mais tarde

### Requirement: Prevenção de importação duplicada
O sistema SHALL impedir que a mesma nota (mesma chave de acesso) seja importada mais de uma vez para a mesma conta.

#### Scenario: Nota já importada
- **WHEN** o usuário tenta importar uma chave de acesso que já foi importada com sucesso para sua conta
- **THEN** o sistema não lança novamente a entrada de estoque, informa que a nota já foi importada e permite consultar a importação existente

### Requirement: Revisão antes da confirmação
O sistema SHALL apresentar os itens extraídos da nota para revisão antes de efetivar a entrada no estoque, permitindo que o usuário confirme ou cancele a operação.

#### Scenario: Confirmação da entrada
- **WHEN** o sistema exibe os itens extraídos e o usuário confirma
- **THEN** o sistema efetiva a entrada de estoque de todos os itens confirmados

#### Scenario: Cancelamento antes de confirmar
- **WHEN** o usuário cancela a importação na tela de revisão
- **THEN** o sistema descarta a operação sem alterar o estoque nem registrar a nota como importada

### Requirement: Entrada manual quando a fonte automática falha
O sistema SHALL oferecer um caminho manual de entrada de estoque para quando a fonte automática de dados da nota (ex.: portal da SEFAZ) estiver indisponível ou retornar dados incompletos, sem depender da consulta automática ter sucesso.

#### Scenario: Fonte automática indisponível
- **WHEN** a importação automática falha por indisponibilidade da fonte (ex.: SEFAZ fora do ar)
- **THEN** o sistema informa a falha e oferece ao usuário continuar por entrada manual dos itens (ou por upload do XML da nota), sem perder a chave de acesso já lida

#### Scenario: Entrada manual de itens
- **WHEN** o usuário opta pela entrada manual e informa os itens (descrição, GTIN opcional, quantidade, unidade)
- **THEN** o sistema trata esses itens da mesma forma que os importados automaticamente, aplicando revisão, correspondência de produtos e registro da entrada

#### Scenario: Complemento manual de nota parcial
- **WHEN** a fonte automática retorna a nota com itens faltando ou incompletos
- **THEN** o sistema permite que o usuário edite, complete ou remova itens na tela de revisão antes de confirmar a entrada

### Requirement: Registro auditável da importação
O sistema SHALL manter o registro de cada nota importada (chave de acesso, data/hora, itens e quantidades) associado à movimentação de estoque gerada, permitindo rastrear a origem de cada entrada.

#### Scenario: Rastreabilidade da entrada
- **WHEN** o usuário consulta uma movimentação de entrada originada de uma nota
- **THEN** o sistema exibe a nota de origem (chave de acesso e data) e os itens que a compõem
