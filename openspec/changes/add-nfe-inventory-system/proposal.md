## Why

Controlar estoque manualmente (digitar produto, quantidade e preço a cada compra) é lento e sujeito a erros, o que inviabiliza o controle contínuo em pequenos negócios. Toda NFe/NFC-e brasileira já carrega, dentro do seu QR Code, a chave de acesso que aponta para os dados completos da nota na SEFAZ — todos os produtos, quantidades e valores. Este projeto (TCC) aproveita esse dado para que uma única leitura de câmera dê entrada em todos os itens da nota no estoque, com o mínimo de intervenção humana, funcionando tanto em celular quanto em computador.

## What Changes

- Nova aplicação **web (site) acessada pelo navegador por uma URL**, sem necessidade de instalação nem loja de apps: a mesma página abre e funciona em celular e desktop a partir de uma única base de código e usa a câmera do dispositivo pelo navegador. Instalação como PWA (ícone na tela inicial, uso offline básico) é opcional, não obrigatória.
- O site fica acessível por URL para testes: em desenvolvimento, alcançável pelo computador e por celulares na mesma rede (via HTTPS/contexto seguro, exigido pela câmera); com opção de publicação em um host para acesso externo.
- Cadastro e login de usuários; cada conta possui seu próprio estoque isolado.
- Leitura por câmera do QR Code de NFC-e (e leitura de código de barras EAN/GTIN como apoio), extraindo a chave de acesso / URL da SEFAZ.
- Importação automática da nota: a partir da chave de acesso, o sistema obtém os dados da nota, extrai os produtos e lança a entrada de estoque de todos os itens de uma vez.
- Correspondência automática de produtos: itens já conhecidos (por GTIN/descrição) têm o estoque incrementado; itens novos são criados automaticamente no catálogo — minimizando digitação.
- Prevenção de duplicidade: uma mesma nota (mesma chave de acesso) não é importada duas vezes.
- Trabalho manual como caminho de primeira classe: como o portal da SEFAZ pode ficar fora do ar ou trazer dados incompletos, o usuário sempre pode entrar/complementar/editar os itens manualmente (ou enviar o XML da nota) sem depender da consulta automática.
- Tela de login com campo de login (e-mail) e senha, botão de entrar e um botão pequeno de cadastro que leva à criação de conta.
- Gestão de estoque: catálogo de produtos, saldos atuais, histórico de movimentações e ajustes manuais quando necessário.

## Capabilities

### New Capabilities
- `user-auth`: cadastro, autenticação por sessão e isolamento dos dados de estoque por conta de usuário.
- `nfe-scanning`: captura por câmera (celular e desktop) do QR Code de NFC-e e de códigos de barras EAN/GTIN, extraindo a chave de acesso ou o identificador do produto.
- `nfe-import`: resolução da chave de acesso junto à fonte de dados da nota, extração dos produtos e criação idempotente de entradas de estoque a partir da nota.
- `inventory`: catálogo de produtos, saldos de estoque, correspondência/criação automática de itens, movimentações e ajustes manuais.

### Modified Capabilities
<!-- Nenhuma. Projeto greenfield: não há specs existentes a modificar. -->

## Impact

- **Projeto novo (greenfield)** — o repositório hoje só contém andaimes (OpenSpec, README). Serão introduzidos:
  - Frontend PWA em React + TypeScript (câmera via `getUserMedia`, decodificação de QR/barcode no navegador).
  - Backend Node.js (API REST) responsável por autenticação, importação da nota e regras de estoque.
  - Banco de dados relacional (usuários, produtos, saldos, notas importadas, movimentações).
- **Dependências externas**: fonte de dados da NFe/NFC-e (portais da SEFAZ estaduais); a estratégia exata de obtenção e suas limitações legais/operacionais são detalhadas em `design.md`.
- **Privacidade/LGPD**: dados fiscais e de conta ficam sob responsabilidade da aplicação; tratamento e retenção descritos no design.
