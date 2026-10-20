# Proposal

## Why

A lista de produtos do Dashboard se mantém atualizada por Realtime e por uma consulta a cada 20 segundos, mas quando algo falha (uma retirada ou entrada que dá erro, ou um evento de Realtime perdido) a tela pode ficar mostrando uma quantidade antiga até a próxima consulta, e hoje o usuário não tem como pedir a atualização na hora.

## What Changes

- Botão de recarregar, com ícone e estado de carregamento (desabilitado enquanto busca), nas abas de produtos do Dashboard (**Produtos** e **Sem estoque**), ao lado da busca e da escolha de layout.
- O botão busca a lista de novo no servidor e substitui o que está na tela; é uma leitura, não grava nem altera nenhuma quantidade por conta própria.
- Depois de uma retirada ou entrada que termina em erro, a lista é recarregada automaticamente.
- Se o recarregamento falhar, aparece uma mensagem discreta e a lista atual é mantida.
- A consulta automática de 20 s continua e não exibe mensagem de erro.

## Capabilities

### New Capabilities
- `dashboard/product-refresh`: recarga manual e automática (após erro) da lista de produtos, com estado de carregamento e aviso de falha.

### Modified Capabilities
<!-- Nenhuma: a retirada (products/stock-withdrawal) e a entrada (products/stock-entry) não mudam de regra; o comportamento de recarga fica descrito na capability nova. -->

## Impact

- **Frontend**: `pages/Dashboard.jsx` (função de busca com estado de carregamento e erro, botão nas barras de Produtos e Sem estoque), `components/WithdrawModal.jsx` (aviso de erro ao Dashboard) e, quando existir, o modal de Entrada da change `adicionar-cargo-socio-e-arquivar-produtos`.
- **Backend e banco**: nenhum.
- Não altera NF-e, upload de XML, leitor de câmera nem regras de estoque.
