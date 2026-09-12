## Context

Ver `proposal.md` — Why para a motivação. Projeto greenfield: o repositório contém apenas andaimes (OpenSpec, README). O produto é um PWA (celular + desktop, uma base de código) com backend Node e banco relacional, multiusuário com login.

Restrições que moldam o design:
- **Acesso à câmera no navegador** exige contexto seguro (HTTPS ou `localhost`) para `getUserMedia`. Isso condiciona ambiente de dev e deploy.
- **Fonte de dados da NFC-e**: o QR Code da NFC-e não contém os produtos — contém uma URL de consulta da SEFAZ com a chave de acesso de 44 dígitos e parâmetros de assinatura. Os dados estruturados completos vivem no XML da nota, cujo acesso oficial (via web service da SEFAZ) requer **certificado digital** e, em geral, autorização do emitente/destinatário. Sem isso, a via prática é a **página pública de consulta** da SEFAZ, que varia por estado e é frágil.
- **TCC**: prioriza demonstrar o fluxo ponta a ponta (escanear → importar → estoque) com escopo realista, não cobrir todos os 27 estados nem integrações fiscais oficiais.

## Goals / Non-Goals

**Goals:**
- Fluxo automático: uma leitura de QR da NFC-e importa todos os itens da nota para o estoque, com revisão e confirmação.
- Uma base de código servindo celular e desktop (PWA responsivo, instalável).
- Isolamento de dados por conta e idempotência de importação de notas.
- Arquitetura que isola a obtenção de dados da nota atrás de uma interface, para trocar a estratégia sem afetar o resto.

**Non-Goals:**
- Integração oficial com web services da SEFAZ via certificado digital (fora do escopo do TCC).
- Emissão de notas fiscais, cálculo tributário ou conformidade fiscal.
- Suporte garantido a todos os estados no MVP (foco em 1–2 estados/layout de QR, extensível).
- Sincronização offline completa e leitura offline da nota (a importação exige rede).

## Decisions

### Stack e formato do app
- **Frontend**: React + TypeScript, servido como **site acessado pelo navegador por uma URL** (SPA responsiva). O PWA (manifest + service worker) é uma camada **opcional** por cima — permite instalar e uso offline básico, mas o uso primário é abrir a URL no navegador do celular ou do desktop, sem instalar. Alternativa considerada: app nativo/Flutter — rejeitada por exigir base de código separada e não rodar direto no navegador (ver decisão do usuário).

### Acessibilidade para testes (acessar e testar em celular e desktop)
- O frontend e a API são **servidos pela rede** (não é app local de arquivo). Em desenvolvimento, o servidor escuta em `0.0.0.0` para ser alcançável pelo computador e por celulares na **mesma rede Wi‑Fi**.
- A câmera exige **contexto seguro** (HTTPS ou `localhost`). Para testar no celular por IP da rede local, usa-se HTTPS com certificado de desenvolvimento (ex.: mkcert) ou um túnel HTTPS. Sem isso, a câmera não abre no celular; a entrada manual continua funcionando.
- Para acesso externo (fora da rede local), publicar em um host (ex.: um PaaS gratuito para o backend + hospedagem estática para o frontend). Qual host é decisão de implantação, não de arquitetura.
- **Backend**: **Node.js** com framework HTTP (Fastify ou Express) expondo API REST. Mantém uma única linguagem (TS) no projeto todo.
- **Banco**: **PostgreSQL** (relacional) — modelo naturalmente relacional (usuários → produtos → movimentações → notas). SQLite é aceitável para desenvolvimento/demonstração.
- **Acesso a dados**: um ORM (ex.: Prisma) para produtividade e migrações versionadas. Decisão detalhada fica para a implementação.

### Leitura de QR/código de barras no cliente
- Decodificação **no navegador**, sem enviar imagem ao servidor: usar a `BarcodeDetector` API quando disponível e uma biblioteca JS (ex.: ZXing/`html5-qrcode`) como fallback para navegadores sem suporte (notadamente iOS Safari).
- Preferir câmera traseira (`facingMode: "environment"`) e permitir alternância. Sempre oferecer **entrada manual** da chave/GTIN como fallback quando não há câmera/permissão.

### Obtenção dos dados da NFC-e (decisão central e de maior risco)
- **Estratégia adotada no MVP**: a partir do QR, extrair a **chave de acesso (44 dígitos)** e a URL de consulta; o **backend** acessa a **página pública de consulta da SEFAZ** correspondente e faz *parsing* do HTML para extrair os itens (descrição, GTIN quando presente, quantidade, unidade, valor). O parsing fica atrás de uma interface `NotaFiscalProvider`, com uma implementação por estado/layout.
  - **Por que no backend e não no cliente**: evita CORS, permite tratar variações/erros e retentativas, e centraliza o registro auditável.
  - **Alternativas consideradas**:
    - *Web service oficial da SEFAZ com certificado digital* → dados confiáveis e estruturados, mas exige certificado e autorização; **fora do escopo** do TCC.
    - *Usuário faz upload do XML da nota* → simples e robusto quando o XML está disponível; mantido como **caminho alternativo opcional** (`XmlProvider`) que reaproveita o mesmo parser de itens.
    - *Parsing no cliente* → esbarra em CORS e fragilidade; rejeitado.
- **Idempotência**: a chave de acesso é única por conta; importação repetida é bloqueada (ver spec `nfe-import`).
- **Revisão obrigatória**: por a fonte ser frágil, os itens extraídos passam por tela de revisão antes de efetivar o estoque.
- **Trabalho manual como caminho de primeira classe (não só fallback de erro)**: a mesma tela de revisão permite adicionar, editar, completar e remover itens manualmente. Se a fonte automática (SEFAZ) estiver fora do ar ou retornar dados parciais, o usuário parte direto para a entrada manual (ou upload do XML) preservando a chave de acesso já lida. Todos os caminhos (SEFAZ, XML, manual) convergem para o mesmo fluxo de revisão → correspondência de produtos → registro da entrada, de modo que a indisponibilidade da SEFAZ nunca bloqueia a operação do estoque.

### Correspondência de produtos
- Chave primária de correspondência: **GTIN**; fallback por **descrição normalizada** (maiúsculas, sem acentos, espaços colapsados) dentro da conta. Sem correspondência → cria produto novo. Regra vive na capability `inventory`.

### Autenticação
- Senhas com hash forte (**argon2** ou **bcrypt**). Sessão via **cookie httpOnly** (ou JWT de curta duração) sobre HTTPS. Toda rota de estoque exige sessão e filtra por `user_id`.

### Modelo de dados (visão geral)
- `users(id, email, password_hash, created_at)`
- `products(id, user_id, description, description_normalized, gtin, unit, created_at)`
- `stock_balances` (ou saldo derivado das movimentações) `(product_id, quantity)`
- `stock_movements(id, product_id, type[in|out|adjust], quantity, source[nfe|manual], nfe_id?, created_at)`
- `imported_notes(id, user_id, access_key UNIQUE por user, issued_at, imported_at, raw_ref)`
- `imported_note_items(id, note_id, description, gtin?, quantity, unit, unit_value, product_id)`

## Risks / Trade-offs

- **Fragilidade do scraping da SEFAZ** (layout muda, indisponibilidade, captcha, diferença entre estados) → Mitigação: interface `NotaFiscalProvider` por estado; tela de revisão antes de confirmar; fallback de upload de XML e entrada manual; tratar falha sem alterar estoque.
- **Cobertura limitada de estados no MVP** → Mitigação: focar 1–2 estados e documentar como estender; deixar explícito na spec que dados podem estar indisponíveis.
- **iOS/Safari e `getUserMedia`/PWA** têm restrições (permissões, instalação limitada) → Mitigação: biblioteca de decodificação com fallback e sempre oferecer entrada manual.
- **Aspectos legais/LGPD** ao consultar e armazenar dados fiscais → Mitigação: armazenar o mínimo necessário, vincular à conta, acesso autenticado; consultar apenas páginas públicas; não persistir dados sensíveis além do necessário para o estoque.
- **Qualidade da correspondência automática** (descrições divergentes entre notas) → Mitigação: priorizar GTIN; normalizar descrição; permitir edição/mesclagem manual de produtos.

## Migration Plan

Projeto novo — não há migração de dados. Implantação inicial:
1. Provisionar banco e rodar migrações do schema.
2. Publicar backend e frontend sob **HTTPS** (requisito da câmera e dos cookies seguros).
3. Configurar a(s) implementação(ões) de `NotaFiscalProvider` para o(s) estado(s)-alvo.
Rollback: como é greenfield, "rollback" equivale a não publicar; migrações devem ser reversíveis durante o desenvolvimento.

## Open Questions

- Qual(is) estado(s) da SEFAZ serão alvo do MVP para o parser de consulta pública? (Não altera specs nem arquitetura — apenas quais implementações de `NotaFiscalProvider` são escritas primeiro; pode ser decidido no início da implementação.)
