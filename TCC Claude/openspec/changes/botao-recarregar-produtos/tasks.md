# Tasks

## 1. Recarga da lista e botão

- [ ] 1.1 Em `Dashboard.jsx`, criar a busca com resultado, `recarregando`, `erroRecarga`, trava de concorrência e descarte de respostas antigas (D1), mantendo `fetchProducts` silencioso para carga inicial, polling e demais usos. Verificar com `npm run build` e, no navegador, que a carga inicial, o polling de 20 s e salvar um produto continuam atualizando a lista sem mensagens.
- [ ] 1.2 Criar `components/RecarregarProdutos.jsx` e usá-lo na barra da aba Produtos (depois do seletor de layout) e no cabeçalho da aba Sem estoque: ícone, rótulo acessível, desabilitado e girando enquanto carrega, mensagem discreta de falha que some sozinha, tema claro/escuro e 360 px. Verificar no navegador: clicar corrige uma quantidade alterada direto no Supabase, o botão fica desabilitado durante a busca, e com o servidor parado aparece "Não foi possível recarregar. Tente novamente." mantendo a lista.
- [ ] 1.3 Conferir que a recarga é somente leitura e não mexe na tela: busca, layout, ordenação por coluna e páginas por categoria continuam como estavam (páginas inexistentes caem para a última), e nenhum registro novo aparece em Movimentações. Verificar no navegador e consultando o histórico.

## 2. Recarga após erro

- [ ] 2.1 `WithdrawModal.jsx`: nova prop opcional `onError` chamada depois de exibir a mensagem de erro; no Dashboard, passar uma função que recarrega a lista em silêncio. Verificar no navegador forçando um erro (retirar mais do que o servidor tem, depois de reduzir a quantidade direto no Supabase): o modal mostra a mensagem e a lista passa à quantidade real; uma retirada bem-sucedida não dispara recarga extra.
- [ ] 2.2 Se o modal de Entrada da change `adicionar-cargo-socio-e-arquivar-produtos` já existir, aplicar a mesma prop `onError` e verificar um erro de entrada no navegador; se ainda não existir, registrar aqui que a integração fica para essa change.

## 3. Integração

- [ ] 3.1 Regressão: Realtime de produtos, paginação por categoria, abas Início, Sem estoque e Equipe, `npm run build` e `npm run lint` sem erros novos, e consulta de NF-e, upload de XML e leitor de câmera inalterados. Verificar com uma passada manual completa e o resultado anotado na conversa.
