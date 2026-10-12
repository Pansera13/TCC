# Proposal

## Why

O botão "Sair" no header do Dashboard está saindo parcialmente da tela em algumas resoluções, comprometendo a usabilidade. Além disso, o botão "+ Novo produto" não possui funcionalidade implementada — o fluxo de entrada de produtos no estoque precisa suportar tanto cadastro manual quanto leitura automática via câmera de NF-e (QR code ou código de barras linear), tornando o processo de recebimento de mercadoria mais ágil e confiável.

## What Changes

- Corrigir o alinhamento/overflow do botão "Sair" no header do Dashboard para que ele nunca fique cortado fora da tela.
- Implementar o botão "+ Novo produto" com um modal que apresenta duas opções:
  - **Manual**: formulário com campos nome, quantidade, unidade de medida, peso (kg) e categoria.
  - **Câmera**: leitura de QR code ou código de barras (EAN-13/Code-128) do DANFE da NF-e via câmera do dispositivo, seguida de consulta à API da SEFAZ para obter a lista de produtos, e exibição para confirmação antes de salvar no estoque.
- Nenhuma quebra de compatibilidade com fluxos existentes (auth, navegação).

## Capabilities

### New Capabilities

- `products/add-modal`: Modal de adição de produto com seleção de modo (manual ou câmera), formulário de cadastro manual e fluxo de confirmação de itens.
- `products/nfe-scan`: Leitura de código de barras/QR code de NF-e via câmera, decodificação da chave de acesso e consulta à SEFAZ para extração da lista de produtos a receber.

### Modified Capabilities

<!-- Nenhuma especificação existente com mudança de requisitos. -->

## Impact

- **Frontend**: `Dashboard.jsx` — correção do header, novo componente `AddProductModal`, lógica de câmera (WebRTC `getUserMedia` + biblioteca de scanner, ex. `html5-qrcode`).
- **Backend**: novo endpoint `POST /api/products` para salvar produto manualmente; possível proxy endpoint para consulta SEFAZ (evitar CORS no browser).
- **Dependências**: adição de biblioteca de leitura de código de barras no frontend (ex. `html5-qrcode` ou `@zxing/browser`).
- **Sem impacto** nos módulos de autenticação.
