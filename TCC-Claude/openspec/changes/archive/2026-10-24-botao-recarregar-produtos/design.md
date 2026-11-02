# Design

## Context

Estado observado em `frontend/src/pages/Dashboard.jsx`:

- `fetchProducts()` faz `GET /api/products`, grava com `setProducts(data)` e engole qualquer erro. É usada na carga inicial, a cada 20 s (`setInterval`), depois de cadastrar/editar produtos e como fallback do Realtime (UPDATE/INSERT/DELETE em `products`).
- A barra da aba Produtos tem a busca e o seletor de layout; **não há seletor de ordenação**: a ordenação é feita clicando nos títulos das colunas (`SortTh`). A aba Sem estoque tem só um cabeçalho com título e contagem.
- `WithdrawModal` mostra o erro no próprio modal e só chama `onWithdrawn` no sucesso; o Dashboard não fica sabendo de falhas. O modal de Entrada ainda não existe (vem na change `adicionar-cargo-socio-e-arquivar-produtos`).

Motivação: ver `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Dar ao usuário uma recarga imediata e confiável da lista.
- Corrigir sozinha a tela após retirada/entrada com erro.

**Non-Goals:**
- Mudar o Realtime, o intervalo de 20 s ou o servidor.
- Recarregar movimentações, relatórios ou equipe.
- Mexer na ordenação (continua por coluna).

## Decisions

### D1. Uma função de busca com resultado e controle de concorrência
`fetchProducts` ganha uma variante que devolve se deu certo e atualiza dois estados: `recarregando` (para o botão) e `erroRecarga` (mensagem). O comportamento silencioso atual é mantido para a carga inicial, o polling e os demais chamadores. Um `ref` com contador de requisição descarta respostas antigas; outro `ref` impede duas buscas manuais simultâneas. **Alternativa descartada**: duplicar a chamada só para o botão (dois caminhos de busca divergiriam).

### D2. Recarga é substituição de dados, não de interface
`setProducts(data)` com a resposta do servidor; busca, layout, ordenação e páginas ficam em estados próprios e não são tocados. A paginação por categoria já corrige páginas que deixam de existir.

### D3. Onde fica o botão
Um pequeno componente `RecarregarProdutos` (ícone, `title`/`aria-label` "Recarregar produtos", ícone girando enquanto carrega, mensagem de erro discreta ao lado) usado na barra da aba Produtos (depois do seletor de layout) e no cabeçalho da aba Sem estoque. Tema escuro e celular seguem os padrões dos botões vizinhos.

### D4. Erro de retirada/entrada
Os modais ganham a prop opcional `onError`; no erro, chamam-na depois de exibir a mensagem. O Dashboard passa uma função que dispara a recarga **silenciosa** (sem mensagem de erro própria, para não competir com a do modal). O modal de Entrada, quando existir, usa a mesma prop. **Alternativa descartada**: recarregar dentro de `finally` do modal (também recarregaria no sucesso, que já atualiza a quantidade localmente).

### D5. Mensagem de falha
Texto fixo "Não foi possível recarregar. Tente novamente.", exibido junto ao botão e removido por temporizador (cerca de 4 s) ou na próxima tentativa. Sem alerta modal nem notificação.

## Risks / Trade-offs

- [A recarga sobrescreve a atualização otimista de uma retirada que acabou de ser feita, se a resposta do servidor chegar antes de ser confirmada] → o contador de requisição descarta respostas anteriores a uma mudança local mais nova; a retirada só atualiza a tela depois de confirmada pelo servidor.
- [Recarga e polling no mesmo instante] → a trava de concorrência evita duas buscas; o polling continua independente do estado do botão.
- [O modal de Entrada não existe ainda] → a integração dele é uma tarefa condicional; a spec vale quando a entrada existir.

## Open Questions

- Mostrar também o horário da última atualização ao lado do botão? Não altera specs nem tarefas e pode vir depois.
