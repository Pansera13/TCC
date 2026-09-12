## Purpose

Capturar, pela câmera do dispositivo (celular ou computador), o QR Code de uma NFC-e ou o código de barras de um produto, extraindo a informação necessária (chave de acesso da nota ou GTIN do item) para as demais etapas.

## ADDED Requirements

### Requirement: Leitura por câmera em celular e desktop
O sistema SHALL oferecer uma interface de captura por câmera que funcione tanto em navegadores de celular quanto de desktop, solicitando permissão de câmera e exibindo o preview em tempo real durante a leitura.

#### Scenario: Permissão de câmera concedida
- **WHEN** o usuário abre a tela de leitura e concede permissão de acesso à câmera
- **THEN** o sistema exibe o preview da câmera e inicia a tentativa de decodificação de códigos

#### Scenario: Permissão de câmera negada
- **WHEN** o usuário nega ou o dispositivo não disponibiliza a permissão de câmera
- **THEN** o sistema informa que a câmera é necessária e oferece uma alternativa de entrada manual do código/chave de acesso

#### Scenario: Seleção de câmera em dispositivos com múltiplas câmeras
- **WHEN** o dispositivo possui mais de uma câmera (ex.: frontal e traseira)
- **THEN** o sistema utiliza preferencialmente a câmera traseira e permite alternar entre as câmeras disponíveis

### Requirement: Extração da chave de acesso da NFC-e
O sistema SHALL reconhecer o QR Code de uma NFC-e e extrair dele a chave de acesso de 44 dígitos, validando seu formato antes de encaminhar para importação.

#### Scenario: QR Code de NFC-e válido
- **WHEN** o usuário aponta a câmera para o QR Code de uma NFC-e e ele é decodificado
- **THEN** o sistema extrai a chave de acesso de 44 dígitos e a disponibiliza para a etapa de importação

#### Scenario: QR Code não reconhecido como NFC-e
- **WHEN** o código lido não corresponde ao formato de QR Code de NFC-e e não contém uma chave de acesso válida
- **THEN** o sistema informa que o código não é uma NFC-e válida e mantém a captura ativa para nova tentativa

### Requirement: Leitura de código de barras de produto
O sistema SHALL reconhecer códigos de barras EAN-8/EAN-13 (GTIN) de produtos individuais e disponibilizar o GTIN lido para consulta ou ajuste no catálogo.

#### Scenario: Código de barras EAN/GTIN válido
- **WHEN** o usuário aponta a câmera para um código de barras EAN/GTIN legível
- **THEN** o sistema decodifica o GTIN e o disponibiliza para localizar ou cadastrar o produto correspondente

#### Scenario: Entrada manual de código
- **WHEN** o usuário opta por digitar manualmente uma chave de acesso ou GTIN em vez de usar a câmera
- **THEN** o sistema valida o formato do valor informado e o encaminha para a mesma etapa da leitura por câmera
