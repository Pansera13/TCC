# Design

## Context

O Dashboard é um SPA React (Vite + Tailwind CSS). O header usa `flex items-center justify-between` e o lado direito (`div.flex.items-center.gap-2`) não tem `flex-shrink: 0`, o que permite que o container comprima e o botão "Sair" extravase em telas menores. O botão "+ Novo produto" existe como elemento estático sem handler. O backend usa Express.js com MySQL; há autenticação JWT já implementada. Não existe endpoint de produtos ainda.

## Goals / Non-Goals

**Goals:**
- Corrigir o overflow do botão "Sair" com CSS mínimo (`shrink-0` no container direito do header).
- Adicionar modal de adição de produto com dois modos: formulário manual e scanner NF-e via câmera.
- Implementar leitura de QR code e código de barras linear no browser usando biblioteca de scan.
- Criar endpoint backend para salvar produto individualmente.
- Criar endpoint backend proxy para consulta de NF-e (evitar CORS ao chamar SEFAZ diretamente do browser).
- Exibir tela de confirmação antes de importar produtos da NF-e.

**Non-Goals:**
- Integração direta com sistema fiscal da empresa ou emissão de notas.
- Edição ou exclusão de produtos (escopo futuro).
- Paginação ou busca na lista de produtos (escopo futuro).
- Autenticação específica na API SEFAZ (uso do webservice público de consulta).

## Decisions

### 1. Biblioteca de scanner: `html5-qrcode`

**Escolha**: `html5-qrcode` (wrapper sobre ZXing).  
**Por quê**: suporta QR code e múltiplos formatos lineares (Code-128, ITF-14, EAN-13) com uma API simples para React; documentação ativa; não exige WebAssembly como alternativas mais pesadas.  
**Alternativa descartada**: `@zxing/browser` — mais flexível, mas requer integração manual mais complexa para suportar múltiplos formatos simultâneos.

### 2. Consulta NF-e via proxy no backend

**Escolha**: criar endpoint `GET /api/nfe/:chave` no backend Express que consulta o webservice da SEFAZ e retorna os produtos.  
**Por quê**: SEFAZ retorna XML via SOAP; o frontend não consegue processar SOAP diretamente nem contornar CORS. O backend faz o parse do XML (biblioteca `xml2js`) e retorna JSON.  
**Alternativa descartada**: usar API de terceiros (ex. NFe.io, Focus NF-e) — exige cadastro, chave de API paga e dependência externa não justificada para TCC.

### 3. Modal com abas no mesmo componente

**Escolha**: um único componente `AddProductModal` com estado interno `mode: 'manual' | 'camera'`.  
**Por quê**: as duas opções compartilham o mesmo contexto de abertura/fechamento e o estado de confirmação; manter em um componente evita prop drilling e mantém a lógica coesa.

### 4. Fix do botão "Sair": `shrink-0` no container direito do header

**Escolha**: adicionar `shrink-0` ao `div` que envolve o botão de dark mode e o botão "Sair" no header.  
**Por quê**: a causa raiz é que o container direito encolhe quando a área central do header fica sem espaço. `shrink-0` garante que o container nunca seja comprimido abaixo de seu tamanho natural.

## Risks / Trade-offs

- **SEFAZ fora do ar ou lenta** → O proxy backend deve ter timeout de 10s e retornar erro descritivo; o frontend exibe mensagem com opção de retry.
- **Câmera indisponível (HTTP sem HTTPS)** → `getUserMedia` requer HTTPS em produção. Em desenvolvimento (`localhost`) funciona. Nota para deploy.
- **Formato de NF-e desconhecido** → O parser XML deve lidar com NF-e modelo 55 e NFC-e modelo 65; modelos não suportados retornam erro "formato não reconhecido".
- **`html5-qrcode` adiciona ~300 KB ao bundle** → Aceitável para um TCC; pode ser lazy-loaded para minimizar impacto no carregamento inicial.

## Migration Plan

1. Instalar `html5-qrcode` e `xml2js` via npm.
2. Aplicar fix CSS no `Dashboard.jsx` (atômico, sem quebra).
3. Criar `AddProductModal.jsx` e conectar ao botão existente.
4. Adicionar `POST /api/products` e `GET /api/nfe/:chave` no backend.
5. Testar em localhost com HTTPS desabilitado (câmera funciona em `http://localhost`).
6. Nenhum rollback necessário — mudanças são aditivas.
