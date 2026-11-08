# Design

## Context

Ver proposal.md — Why para a motivação. Ponto de partida medido: carga inicial com 8 req (4 de `/api/profile`, 2 de notificações, 2 de produtos); repouso com 4 req/min por aba; NF-e com N POSTs em paralelo.

Stack relevante: React 19 + Vite (frontend), Django + DRF (backend), Axios (cliente HTTP), Supabase Realtime (WebSocket), `useFitRows` (hook próprio que mede DOM com ResizeObserver + useLayoutEffect).

Restrições invioláveis: nenhuma mudança visual, nenhuma alteração de schema do banco, nenhum endpoint existente muda formato de resposta, nenhuma dependência npm nova sem justificativa aqui.

## Goals / Non-Goals

**Goals:**
- Implementar as 9 correções de tráfego descritas na proposal, sem alterar visual nem comportamento percebido.
- Adicionar `POST /api/products/lote` no backend com transação atômica.
- Preparar o sistema para a change `limite-geral-da-api`.

**Non-Goals:**
- Paginação server-side de produtos (a paginação opcional de `GET /api/products` é um bônus de compatibilidade, não uma meta desta change).
- Alteração de tabelas, colunas ou funções no banco de dados.
- Modificação de qualquer endpoint existente ou seu formato de resposta.
- Qualquer nova dependência npm (hooks e utilitários simples existentes são suficientes).

## Decisions

### D1 — Tratamento central de 429 em `api.js`

**Escolha:** Adicionar ao interceptor de resposta do Axios. Cada chamada que deve ser tratada como "automática" (polling) define `config._automatic = true` no momento de chamar. O interceptor distingue pelo flag.

**Por que não um wrapper por módulo:** Chamadas de polling estão espalhadas em `Dashboard.jsx` e `NotificationBell.jsx`. Centralizar em `api.js` garante consistência sem modificar cada chamador além de adicionar o flag.

**Detalhe:** `retry_after` é armazenado num ref global em `api.js` por rota prefixo (`/api/products`, `/api/notificacoes`). Quando o flag `_automatic` está presente e o status é 429, o interceptor registra o instante e retorna rejeição para o chamador; o chamador (polling) verifica o instante antes de disparar a próxima chamada. Chamadas manuais (sem `_automatic`) simplesmente rejeitam o erro para o componente tratar como hoje.

**Alternativa descartada:** Usar um interceptor que faz retry automático com `setTimeout` — complicaria o controle de cancelamento e o estado de loading dos componentes.

### D2 — Profile único no `AuthContext`

**Escolha:** Adicionar `useEffect` em `AuthProvider` que chama `getProfile()` uma única vez após a montagem e expõe `profileLoaded` + `revalidateProfile()` no contexto. Dashboard e TopNav removem suas chamadas individuais e passam a ler `user` do contexto (que já tem `avatarUrl`, `role` e `permissoes` atualizados).

**Por que no AuthContext e não num hook customizado:** O contexto já é montado uma vez por sessão e já gerencia `user`. Colocar o fetch aqui evita criar um novo provedor e garante que os dados estejam prontos antes de qualquer rota do Dashboard montar.

**StrictMode:** Em dev, `useEffect` monta duas vezes. Usar um ref `profileFetchedRef` dentro do efeito garante que apenas a primeira chamada seja feita (a segunda verifica o ref e retorna cedo).

### D3 — Polling de produtos como fallback condicional

**Escolha:** No callback de `subscribe()` do canal `products-realtime`, gravar o status num ref `realtimeStatusRef`. Um segundo `useEffect` observa esse ref: se status é `SUBSCRIBED`, cancela o `setInterval`; caso contrário, inicia/mantém o intervalo de 60 s. O polling é pausado verificando `document.hidden` no início de cada tick.

**Atualização ao ganhar foco:** Listener de `visibilitychange` em `Dashboard.jsx`: quando `document.visibilityState === 'visible'`, chama `buscarProdutos()` uma vez. Flag `lastFocusFetchRef` (timestamp) garante que não haja duplicata com o polling que poderia coincidir.

**Alternativa descartada:** `setInterval` com verificação de `document.hidden` no tick — funcionaria, mas acorda o JS engine mesmo quando oculto; prefere-se cancelar/reiniciar com `visibilitychange`.

### D4 — Estabilização de `pageSize` em `MovementsHistory`

**Problema:** `useFitRows` usa `useLayoutEffect` para medir o DOM e pode ajustar `pageSize` em 2–3 ciclos (8 → 13 → 14). `MovementsHistory` inclui `pageSize` no `key` da query, então cada ajuste dispara uma requisição.

**Escolha:** Adicionar um `useEffect` sem dependências (roda após cada render) que compara `pageSize` com `stablePageSizeRef.current`. Se diferente, atualiza o ref e reseta um flag `pageSettled = false`; se igual, seta `pageSettled = true`. A query só é feita quando `pageSettled` é verdadeiro. Como `useLayoutEffect` roda antes de `useEffect`, quando a sequência de ajustes de layout terminar, o próximo ciclo de `useEffect` encontrará o valor estabilizado.

**Resultado esperado:** 1 requisição por abertura (em vez de 3).

**Alternativa descartada:** `setTimeout(0)` — não garantido; `useDeferredValue` do React 18 — mudança maior.

### D5 — Cache de arquivados em memória

**Escolha:** Trocar a flag `loadingArquivados` boolean por um estado `arquivadosState: { data: [], loaded: false }`. `fetchArquivados` só chama a API quando `loaded === false`. As ações que invalidam o cache (arquivar, restaurar, excluir) chamam uma função `invalidarArquivados()` que seta `loaded = false`. O botão Atualizar já existente chama diretamente `fetchArquivados()` após setar `loaded = false`.

**Alternativa descartada:** `useMemo` ou contexto separado — desnecessário para dados que mudam raramente.

### D6 — Debounce de 500 ms nos relatórios

**Escolha:** Manter `custom` como estado local de `input` controlado. Adicionar um segundo estado `debouncedCustom` e um `useEffect` que copia `custom` → `debouncedCustom` com delay de 500 ms (usando `clearTimeout` no cleanup). A query usa `debouncedCustom`. Ao clicar em "Personalizado", `from`/`to` não mudam (mantêm o valor do último intervalo personalizado ou os valores iniciais), portanto `debouncedCustom` não muda e nenhuma query é disparada.

**Alternativa descartada:** Botão "Aplicar" — a proposta veda explicitamente essa opção.

### D7 — Deduplicação de focus/visibilitychange em `NotificationBell`

**Escolha:** Adicionar `lastCarregarRef = useRef(0)`. No início de `carregar`, verificar `Date.now() - lastCarregarRef.current < 5000`; se sim, retornar cedo. Registrar apenas um dos dois eventos como disparador imediato ao voltar à janela (manter `visibilitychange`; remover o listener de `focus`). O polling de 60 s atualiza `lastCarregarRef` normalmente.

**Por que remover o `focus` listener:** `focus` na `window` dispara quando o usuário alterna entre abas do mesmo navegador, e `visibilitychange` já cobre o retorno de outras janelas. Manter os dois é redundante.

**Alternativa descartada:** Manter os dois listeners + debounce com `setTimeout` — mais código, comportamento menos previsível.

### D8 — Endpoint em lote `POST /api/products/lote`

**Escolha:** Criar uma função auxiliar `_create_or_stack(item, user, conn)` que encapsula a lógica de criação/empilhamento de `_create_product`, sem o decorator `@exige_permissao`. Uma nova view `products_batch` chama essa função para cada item dentro de um único `transaction.atomic()`. Usa `select_for_update()` no empilhamento, como hoje.

**Rota:** `POST /api/products/lote` — necessário registrar ANTES de `products/<int:pk>` em `urls.py` para evitar conflito de path (Django resolve em ordem; "lote" seria interpretado como `pk` se vier depois).

**Autenticação:** Mesmo middleware JWT de hoje (`request.user_data`). Permissão: `produto:importar-nfe` (mesma da NF-e).

**Alternativa descartada:** Envio sequencial com concorrência limitada no frontend — não resolve o problema de atomicidade; se falhar no meio, produtos ficam criados parcialmente.

### D9 — Atualização do `AddProductModal` para usar o endpoint em lote

**Escolha:** Em `handleConfirmNfe`, substituir `Promise.all(nfeProducts.map(...))` por `importProductsBatch({ itens: nfeProducts.map(p => ({ ...p, nfe_chave: nfeChave })) })`. A resposta `{ criados, empilhados }` é ignorada visualmente (comportamento atual: fechar o modal, sem mensagem de totais), preservando a UX exata.

**Mudança de contrato:** O modal passa a depender de `importProductsBatch` (novo export de `api.js`). A chave `nfe_chave` que antes era enviada por requisição individual agora é enviada no corpo do lote.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| Realtime nunca atinge `SUBSCRIBED` (ex.: bloqueio de WebSocket na rede da loja) | Fallback de 60 s ainda ativa, garantindo atualização sem Realtime |
| `useFitRows` nunca estabiliza (ResizeObserver em loop) | `minimo = 3` limita a recursão; comportamento atual seria mantido — query não dispararia; Atualizar manual funciona |
| `stablePageSize` inicial nulo atrasa a primeira consulta | Delay de 1–2 renders (< 16 ms) é imperceptível; spinners já existem |
| Endpoint em lote falha para lotes grandes (timeout de banco) | Limite de 500 itens configurável; NF-es reais raramente passam de 100 itens |
| Cache de arquivados desatualizado após operação de outra sessão | Botão Atualizar já existente permite recarga manual; o Realtime de produtos também invalida quando arquivar via `UPDATE` |
| Quebra visual por mudança inadvertida de JSX | Verificação obrigatória com Playwright (antes × depois) em todos os breakpoints |

## Migration Plan

1. Criar branch `feature/otimizar-requisicoes-do-frontend`.
2. Medir e salvar prints de todas as telas (baseline) antes de qualquer código.
3. Implementar por tarefa na ordem do `tasks.md` (menor risco primeiro: baseline → api.js → AuthContext → polling → notificações → Movimentações → Arquivados → Relatórios → endpoint em lote → NF-e → paginação opcional).
4. Rodar `python -m pytest` após cada tarefa de backend.
5. Rodar `npm run lint` e `npm run build` após cada tarefa de frontend.
6. Ao final: re-medir tráfego com Playwright e comparar prints.
7. Sem rollback automático necessário: mudanças são backward-compatible (nenhum endpoint existente muda, nenhum schema muda).

## Resolved Questions

| # | Decisão |
|---|---|
| OQ-1 | Aviso de 429 **sim**, sem countdown — usar o mesmo padrão discreto do `erroRecarga` em `Dashboard.jsx` (mensagem breve que desaparece após alguns segundos, sem contagem regressiva). O countdown é adequado apenas na tela de login, onde o usuário está bloqueado naquela tela. |
| OQ-2 | Conta de teste para verificação de NF-e: **hpalaoro@hotmail.com**. Lucas confirma e apaga/arquiva os dados criados após o teste. Aguardar confirmação explícita antes de qualquer escrita. |
| OQ-3 | `BATCH_LIMIT` em **`settings.py`** como `NFE_BATCH_LIMIT = int(os.environ.get('NFE_BATCH_LIMIT', 500))` — padrão Django; sobreponível por variável de ambiente se necessário, sem exigir `.env` novo. |
