# dashboard/product-refresh Specification

## Purpose

Permite recarregar a lista de produtos do Dashboard a pedido do usuário, e automaticamente após uma retirada ou entrada com erro, para corrigir quantidades desatualizadas sem alterar o estoque.

## Requirements

### Requirement: Botão de recarregar nas abas de produtos

As abas Produtos e Sem estoque do Dashboard SHALL exibir um botão de recarregar com ícone, na barra superior da lista (na aba Produtos, junto da busca e do seletor de layout), com rótulo acessível "Recarregar produtos". Enquanto a lista estiver sendo buscada, o botão SHALL ficar desabilitado e indicar o carregamento. O botão SHALL funcionar nos quatro layouts de produtos, em celular e em modo escuro.

#### Scenario: Botão visível

- **WHEN** o usuário abre a aba Produtos ou a aba Sem estoque
- **THEN** o botão de recarregar aparece na barra da lista

#### Scenario: Estado de carregamento

- **WHEN** o usuário clica em recarregar
- **THEN** o botão fica desabilitado com indicação de carregamento até a resposta chegar e depois volta ao normal

#### Scenario: Sem cliques duplicados

- **WHEN** o usuário clica em recarregar enquanto uma busca já está em andamento
- **THEN** nenhuma segunda busca é iniciada

### Requirement: Recarregar substitui a lista pelo que está no servidor

Ao recarregar, o sistema SHALL buscar a lista de produtos no servidor e passar a exibir exatamente os dados recebidos. A recarga SHALL ser somente leitura: SHALL NOT gravar, somar ou subtrair nenhuma quantidade, nem registrar movimentações. Uma resposta mais antiga que chegar depois de uma mais nova SHALL ser descartada.

#### Scenario: Quantidade desatualizada corrigida

- **WHEN** a tela mostra 10 unidades de um produto e o servidor tem 7 e o usuário clica em recarregar
- **THEN** a tela passa a mostrar 7 unidades

#### Scenario: Nada é gravado

- **WHEN** o usuário clica em recarregar
- **THEN** nenhuma quantidade é alterada no servidor e nenhuma movimentação é criada

#### Scenario: Busca e página preservadas

- **WHEN** o usuário tem um termo de busca e está em uma página de categoria e recarrega
- **THEN** a busca e o layout escolhidos continuam, e a página de cada categoria só muda se deixar de existir com os dados novos

### Requirement: Recarga automática após retirada ou entrada com erro

Quando uma retirada ou uma entrada de estoque terminar em erro, o sistema SHALL recarregar a lista de produtos automaticamente, sem ação do usuário, e SHALL manter a mensagem de erro do modal. Retiradas e entradas bem-sucedidas continuam atualizando a lista como hoje.

#### Scenario: Retirada com erro

- **WHEN** o servidor responde erro a uma retirada (por exemplo, quantidade maior que o estoque real)
- **THEN** o modal mostra a mensagem de erro e a lista é recarregada em seguida com a quantidade real do servidor

#### Scenario: Entrada com erro

- **WHEN** o servidor responde erro a uma entrada de estoque
- **THEN** o modal mostra a mensagem de erro e a lista é recarregada em seguida

#### Scenario: Retirada bem-sucedida

- **WHEN** a retirada é registrada com sucesso
- **THEN** a lista reflete a nova quantidade e nenhuma recarga extra é disparada por causa do sucesso

### Requirement: Aviso discreto quando a recarga falha

Se o recarregamento falhar (rede ou servidor), o sistema SHALL manter a lista que estava na tela e exibir uma mensagem discreta junto ao botão, que desaparece sozinha após alguns segundos. A consulta automática periódica SHALL continuar sem exibir mensagem de erro.

#### Scenario: Falha ao recarregar

- **WHEN** o usuário clica em recarregar e a requisição falha
- **THEN** a lista atual permanece, o botão volta a ficar habilitado e aparece "Não foi possível recarregar. Tente novamente."

#### Scenario: Falha da consulta automática

- **WHEN** a consulta periódica de 20 segundos falha
- **THEN** nenhuma mensagem é exibida e a lista atual permanece
