# Tasks

## 1. Preparação: branch e baseline visual

- [x] 1.1 Criar branch `feature/otimizar-requisicoes-do-frontend` a partir de `main` e confirmar que `npm run build` e `python -m pytest` passam sem erros nela.
- [ ] 1.2 Tirar prints de baseline com Playwright de todas as telas exigidas (login, Início, Produtos Lista, Produtos Cards, Sem estoque, Arquivados, Movimentações, Relatórios, Equipe, sino aberto, modais de produto/retirada/entrada/NF-e) nos modos claro e escuro e em 375 px e 1280 px. Salvar em pasta temporária fora do repositório. Verificar: pasta existe, prints cobrem todas as 14 telas × 2 modos × 2 larguras.

## 2. Tratamento central de 429 em `api.js`

- [x] 2.1 Adicionar ao interceptor de resposta de `frontend/src/services/api.js` o tratamento de 429: requisições com `config._automatic = true` registram o `retry_after` em um `Map` por prefixo de rota e rejeitam; chamadas manuais rejeitam imediatamente. Verificar: ao simular resposta 429 manual (mock de rede), uma chamada sem `_automatic` propaga o erro normalmente.
- [x] 2.2 Expor um utilitário `isRateLimited(url)` (interno ao módulo) que retorna `true` enquanto o `retry_after` não tiver expirado, e integrar ao polling de produtos (`buscarProdutos`) e ao polling de notificações (`carregar`). Verificar: chamada marcada com `_automatic` que recebe 429 não é repetida até `retry_after` expirar.
- [x] 2.3 Adicionar exibição do aviso de 429 usando o componente/estilo de aviso já existente (OQ-1: se for só aviso discreto sem countdown, usar o mesmo padrão do `erroRecarga` de `Dashboard.jsx`; se for countdown como no login, usar o mesmo componente do `Login.jsx`). Verificar: aviso aparece sem criar novos elementos CSS e `npm run lint` não reporta novos avisos.
- [x] 2.4 Exportar `importProductsBatch(itens)` de `api.js` como `api.post('/api/products/lote', { itens })`. Verificar: exportação existe e `npm run build` passa.

## 3. Profile único no `AuthContext`

- [x] 3.1 Adicionar `useEffect` em `AuthProvider` (`frontend/src/context/AuthContext.jsx`) que chama `getProfile()` uma única vez após a montagem, usando um ref para proteger contra o efeito duplo do StrictMode. Atualizar `user` via `updateUser` com os campos recebidos. Verificar: no console de dev, apenas 1 `GET /api/profile` na carga inicial (em vez de 4 no StrictMode).
- [x] 3.2 Remover a chamada `api.get('/api/profile')` de `Dashboard.jsx` (linhas ~174–181) e de `TopNav.jsx` se houver. Verificar: `Dashboard.jsx` não importa nem chama `getProfile()` diretamente; `npm run build` passa.
- [x] 3.3 Garantir que `PUT /api/profile` em `Dashboard.jsx` chame uma função `revalidateProfile()` (ou equivalente) para que o contexto rebusque o perfil. Verificar: salvar nome ou foto ainda atualiza o avatar/nome exibido no TopNav sem recarregar a página.

## 4. Polling de produtos como fallback condicional

- [x] 4.1 Em `Dashboard.jsx`, passar a monitorar o status do canal `products-realtime` no callback de `subscribe()` e armazenar em `realtimeStatusRef`. Verificar: `console.log` de `[Supabase Realtime] status: SUBSCRIBED` continua aparecendo no console.
- [x] 4.2 Substituir `setInterval(fetchProducts, 20000)` por lógica condicional: criar o intervalo de 60 s somente quando `realtimeStatusRef.current !== 'SUBSCRIBED'`; cancelar o intervalo quando o status virar `SUBSCRIBED`. Verificar: com Realtime conectado, nenhum `GET /api/products` periódico aparece nas ferramentas de desenvolvedor durante 2 minutos de repouso.
- [x] 4.3 Pausar o polling quando `document.hidden` e retomar no `visibilitychange`. Ao retornar ao primeiro plano (`visibilityState === 'visible'`), chamar `buscarProdutos()` uma única vez. Verificar: ocultar a aba por 70 s e voltar gera exatamente 1 `GET /api/products` (a busca imediata ao voltar), sem requisições durante a ocultação.
- [x] 4.4 Corrigir `onError` de `WithdrawModal` e `EntradaModal`: não chamar `fetchProducts` quando o status do erro for 429; limitar a uma recarga por falha não-429. Verificar: simular erro 429 em uma retirada → `GET /api/products` não é disparado; simular erro 400 → exatamente 1 `GET /api/products` é disparado.

## 5. Notificações: deduplicação de eventos

- [x] 5.1 Em `NotificationBell.jsx`, substituir os listeners de `visibilitychange` + `window focus` por apenas `visibilitychange`. Adicionar `lastCarregarRef = useRef(0)` e no início de `carregar` verificar `Date.now() - lastCarregarRef.current < 5000`; retornar cedo se sim; atualizar `lastCarregarRef.current = Date.now()` ao prosseguir. Verificar: ao alternar abas rapidamente (ocultar + mostrar em < 5 s), apenas 1 `GET /api/notificacoes` é disparado.
- [x] 5.2 Pausar o polling de notificações quando `document.hidden`. Verificar: ocultar a aba por 70 s → 0 `GET /api/notificacoes` durante a ocultação (o de 60 s não dispara).

## 6. Movimentações: query única na abertura

- [x] 6.1 Em `MovementsHistory.jsx`, introduzir `stablePageSizeRef` e um `useEffect` sem dependências que detecta quando `pageSize` parou de mudar (ref ≠ pageSize → atualiza ref → aguarda; ref = pageSize → seta estado `pageSizeReady = true`). Remover `pageSize` do `key` e usar `stablePageSize` (o valor de `pageSize` no momento em que `pageSizeReady` fica verdadeiro). Verificar: abrir Movimentações gera exatamente 1 `GET /api/movements` (verificar no painel Network do navegador).
- [x] 6.2 Assegurar que a tabela continua exibindo o número correto de linhas (sem rolagem vertical) após a correção. Verificar: abrir Movimentações com pelo menos 15 registros, nenhuma barra de rolagem vertical na área da tabela, número de linhas idêntico ao anterior à change.

## 7. Arquivados: cache em memória

- [x] 7.1 Em `Dashboard.jsx`, substituir a lógica de `fetchArquivados` para usar um flag `arquivadosLoadedRef`. `fetchArquivados` só chama a API quando `arquivadosLoadedRef.current === false`. `invalidarArquivados()` seta o ref para `false`. Verificar: navegar para Arquivados, trocar para outra aba e voltar → apenas 1 `GET /api/products?arquivados=1` no total.
- [x] 7.2 Chamar `invalidarArquivados()` nos handlers de arquivar, restaurar e excluir produto. Verificar: após arquivar um produto e abrir a aba Arquivados, a lista reflete o produto recém-arquivado (nova busca foi feita).
- [x] 7.3 O botão Atualizar já existente deve chamar `fetchArquivados()` após setar `arquivadosLoadedRef.current = false`. Verificar: clicar em Atualizar gera exatamente 1 `GET /api/products?arquivados=1`.

## 8. Relatórios: debounce de 500 ms

- [x] 8.1 Em `Reports.jsx`, adicionar estado `debouncedCustom` e `useEffect` que copia `custom` → `debouncedCustom` com `setTimeout(500)`. A query usa `debouncedCustom`. Verificar: alterar a data inicial 3 vezes em menos de 500 ms gera apenas 1 `GET /api/reports` (após 500 ms da última alteração).
- [x] 8.2 Garantir que clicar em "Personalizado" não dispara uma nova query: quando `periodo` muda para `'custom'`, `debouncedCustom` permanece com o valor anterior e nenhuma nova requisição é enviada até que o usuário altere as datas. Verificar: com relatório de 30 dias exibido, clicar em "Personalizado" → 0 `GET /api/reports` adicionais.

## 9. Endpoint em lote no backend

- [x] 9.1 Em `backend-django/api/views/products.py`, extrair a lógica de criação/empilhamento de `_create_product` para uma função auxiliar `_create_or_stack(item_body, user)` que opera dentro de uma transação existente (sem criar nova). Verificar: todos os 98 testes existentes passam (`python -m pytest`).
- [x] 9.2 Implementar a view `products_batch`: valida lista não-vazia e tamanho ≤ `BATCH_LIMIT` (padrão 500, em `settings.py` como `NFE_BATCH_LIMIT`); checa deduplicação por `nfe_chave` antes de processar; processa todos os itens em `transaction.atomic()`; retorna `{ "criados": N, "empilhados": M }` com status 201. Verificar: `python -m pytest` passa.
- [x] 9.3 Registrar `path('products/lote', products.products_batch)` em `api/urls.py` ANTES de `path('products/<int:pk>', ...)`. Verificar: `POST /api/products/lote` retorna 403 sem autenticação e 400 com lista vazia (testar com `curl` ou cliente de API).
- [x] 9.4 Escrever testes pytest para `products_batch` em `backend-django/api/tests/`: sucesso com mix de criação e empilhamento, rollback em erro de validação, rollback em erro de banco, permissão negada (403), lote acima do limite (400), lote vazio (400), deduplicação por `chNFe` (409), `tenant_id` isolado, histórico de movimentação gravado. Verificar: todos os novos testes passam e `python -m pytest` passa com 0 falhas.

## 10. Importação de NF-e via endpoint em lote

- [x] 10.1 Em `AddProductModal.jsx`, substituir `handleConfirmNfe`: em vez de `Promise.all(nfeProducts.map(...))`, chamar `importProductsBatch({ itens: nfeProducts.map(p => ({ nome: p.nome, quantidade: p.quantidade, unidade: p.unidade, peso_kg: p.peso_kg ?? null, categoria: null, nfe_chave: nfeChave })) })`. Em caso de sucesso, chamar `onProductsAdded(); onClose()` como hoje. Em caso de erro, chamar `setCameraStep('error'); setCameraError(msg)` como hoje. Verificar: `npm run build` e `npm run lint` passam.
- [ ] 10.2 Verificar com XML de exemplo (dados fictícios, SOMENTE APÓS CONFIRMAR COM O USUÁRIO a conta de teste e o protocolo de limpeza — ver OQ-2): importar XML com 5 itens gera exatamente 1 `POST /api/products/lote` (e 0 `POST /api/products`). Confirmar com o usuário antes de executar qualquer operação de escrita e apagar/arquivar os dados criados com a confirmação do usuário.

## 11. Paginação opcional em GET /api/products (bônus)

- [x] 11.1 Em `_list_products`, verificar se `page` e `page_size` estão presentes na query string. Se sim, aplicar paginação com teto de 100 em `page_size`. Se não, continuar retornando a lista completa idêntica a hoje. Verificar: `GET /api/products` sem parâmetros retorna a mesma resposta de antes (array plano, sem envelope); `GET /api/products?page=1&page_size=10` retorna os 10 primeiros itens.

## 12. Medição depois e comparação visual

- [ ] 12.1 Medir com Playwright (somente leitura) os mesmos cenários do relatório "Tráfego da API": carga inicial, troca de 8 abas, repouso de 2 minutos, relatórios, Movimentações. Registrar os números em "01 - Sistema/Tráfego da API.md" na seção "Antes × Depois". Verificar que as metas foram atingidas: carga inicial ≤ 4 req; repouso ≤ 4 req/min; aba oculta 0 req; NF-e de 30 itens = 1 req; Movimentações = 1 req por abertura; relatório personalizado = 1 req por alteração concluída.
- [ ] 12.2 Tirar prints de todas as 14 telas × 2 modos × 2 larguras (mesma matriz do baseline). Comparar par a par com os prints do passo 1.2. Verificar: 0 diferenças visuais. Qualquer diferença é um defeito a corrigir antes de prosseguir.

## 13. Qualidade e documentação final

- [x] 13.1 Rodar `npm run lint` (oxlint) e confirmar 0 novos avisos. Rodar `npm run build` e confirmar 0 erros.
- [x] 13.2 Rodar `python -m pytest` e confirmar que todos os testes (incluindo os novos do passo 9.4) passam com 0 falhas.
- [x] 13.3 Atualizar a matriz de rastreabilidade em "02 - Requisitos/Requisitos (rastreabilidade).md" com os novos requisitos das specs criadas/modificadas nesta change.
- [x] 13.4 Registrar em "03 - Metricas/Registro de metricas.md": tempo de especificação, implementação, correção e validação, erros, retrabalho e intervenções desta change (incluindo qualquer escrita acidental durante as medições do passo 12.1).

## Workflow follow-up

- Confirmar com o usuário as três questões abertas (OQ-1: estilo do aviso de 429; OQ-2: conta de teste para NF-e e protocolo de limpeza; OQ-3: local do `BATCH_LIMIT`) antes de iniciar `/opsx:apply`.
- Após a implementação e validação completas, arquivar a change com `/opsx:archive`.
