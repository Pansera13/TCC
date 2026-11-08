# Spec Delta

## Purpose

Lê o código de barras ou QR code de uma Nota Fiscal Eletrônica (NF-e/NFC-e) via câmera do dispositivo, obtém a lista de produtos da nota e permite que o usuário confirme os itens antes de adicioná-los ao estoque.

## ADDED Requirements

### Requirement: Solicitação de permissão de câmera
O sistema SHALL solicitar permissão de acesso à câmera do dispositivo antes de iniciar a leitura.

#### Scenario: Permissão concedida
- **WHEN** o usuário concede permissão de câmera
- **THEN** o sistema exibe o preview da câmera pronto para escanear

#### Scenario: Permissão negada
- **WHEN** o usuário nega a permissão de câmera
- **THEN** o sistema exibe mensagem informando que a câmera é necessária para esta função e oferece opção de voltar ao modo Manual

### Requirement: Leitura de código de barras e QR code de NF-e
O sistema SHALL detectar e decodificar tanto QR codes (NFC-e) quanto códigos de barras lineares (Code-128/ITF) presentes no DANFE da NF-e, extraindo a chave de acesso de 44 dígitos.

#### Scenario: QR code de NFC-e detectado
- **WHEN** a câmera aponta para um QR code válido de NFC-e
- **THEN** o sistema decodifica o QR code e extrai a chave de acesso ou URL contida nele

#### Scenario: Código de barras linear detectado
- **WHEN** a câmera aponta para um código de barras linear válido de NF-e
- **THEN** o sistema decodifica o código e extrai a chave de acesso de 44 dígitos

#### Scenario: Código inválido ou ilegível
- **WHEN** o sistema não consegue decodificar o código após tempo limite de 30 segundos
- **THEN** o sistema exibe mensagem de erro e oferece opção de tentar novamente ou voltar ao modo Manual

### Requirement: Consulta dos produtos da NF-e
O sistema SHALL utilizar a chave de acesso obtida para consultar os produtos presentes na nota fiscal, via backend ou API intermediária.

#### Scenario: Consulta bem-sucedida
- **WHEN** a chave de acesso é válida e a consulta retorna dados
- **THEN** o sistema exibe a lista de produtos da NF-e com nome, quantidade e unidade de medida de cada item

#### Scenario: Chave inválida ou nota não encontrada
- **WHEN** a consulta retorna erro ou nota não encontrada
- **THEN** o sistema exibe mensagem de erro descritiva e permite tentar novamente ou cancelar

#### Scenario: Falha de rede
- **WHEN** a consulta falha por problema de conectividade
- **THEN** o sistema exibe mensagem de falha de rede e oferece botão de tentar novamente

### Requirement: Tela de confirmação antes de importar
O sistema SHALL exibir todos os produtos encontrados na NF-e para revisão do usuário antes de qualquer adição ao estoque.

#### Scenario: Usuário confirma importação
- **WHEN** o usuário revisa a lista e clica em "Confirmar e Adicionar"
- **THEN** o sistema adiciona todos os produtos listados ao estoque e fecha o modal

#### Scenario: Usuário cancela importação
- **WHEN** o usuário clica em "Cancelar" na tela de confirmação
- **THEN** nenhum produto é adicionado ao estoque e o modal fecha
