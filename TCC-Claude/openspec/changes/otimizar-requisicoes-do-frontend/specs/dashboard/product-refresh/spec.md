# Spec Delta

## ADDED Requirements

### Requirement: Polling de produtos como fallback condicional
O Dashboard SHALL buscar produtos automaticamente em intervalos de 60 s apenas quando o canal Realtime não estiver com status `SUBSCRIBED`. Quando o Realtime estiver `SUBSCRIBED`, o intervalo SHALL ser cancelado. O polling SHALL ser pausado quando `document.hidden` for verdadeiro e retomado quando a aba voltar ao primeiro plano. Ao ganhar foco (visibilitychange para visible ou evento focus na janela), o Dashboard SHALL fazer uma única busca imediata.

#### Scenario: Realtime conectado
- **WHEN** o canal `products-realtime` atinge o status `SUBSCRIBED`
- **THEN** nenhum polling periódico é iniciado ou o existente é cancelado

#### Scenario: Realtime desconectado — fallback ativo
- **WHEN** o canal `products-realtime` cai (status diferente de `SUBSCRIBED`)
- **THEN** o polling de 60 s é ativado como fallback

#### Scenario: Aba oculta
- **WHEN** `document.hidden` é verdadeiro
- **THEN** o polling está suspenso e nenhuma requisição automática é feita

#### Scenario: Aba volta ao primeiro plano
- **WHEN** a aba volta ao primeiro plano (visibilitychange para visible)
- **THEN** exatamente uma busca imediata é feita, independentemente do tempo desde a última

## MODIFIED Requirements

### Requirement: Recarga automática após retirada ou entrada com erro
Quando uma retirada ou uma entrada de estoque terminar em erro, o sistema SHALL recarregar a lista de produtos automaticamente, sem ação do usuário, e SHALL manter a mensagem de erro do modal. Retiradas e entradas bem-sucedidas continuam atualizando a lista como hoje. A recarga automática SHALL NOT ser disparada quando o status do erro for 429; nesse caso, o módulo de tratamento central de 429 é quem coordena a próxima tentativa. Cada falha SHALL disparar no máximo uma recarga automática.

#### Scenario: Retirada com erro
- **WHEN** o servidor responde erro (não 429) a uma retirada
- **THEN** o modal mostra a mensagem de erro e a lista é recarregada uma única vez com a quantidade real do servidor

#### Scenario: Entrada com erro
- **WHEN** o servidor responde erro (não 429) a uma entrada de estoque
- **THEN** o modal mostra a mensagem de erro e a lista é recarregada uma única vez

#### Scenario: Retirada com 429
- **WHEN** o servidor responde 429 a uma retirada
- **THEN** o modal mostra o aviso de limite e a lista não é recarregada automaticamente

#### Scenario: Retirada bem-sucedida
- **WHEN** a retirada é registrada com sucesso
- **THEN** a lista reflete a nova quantidade e nenhuma recarga extra é disparada por causa do sucesso

### Requirement: Aviso discreto quando a recarga falha
Se o recarregamento falhar (rede ou servidor), o sistema SHALL manter a lista que estava na tela e exibir uma mensagem discreta junto ao botão, que desaparece sozinha após alguns segundos. O polling automático SHALL continuar sem exibir mensagem de erro.

#### Scenario: Falha ao recarregar
- **WHEN** o usuário clica em recarregar e a requisição falha
- **THEN** a lista atual permanece, o botão volta a ficar habilitado e aparece "Não foi possível recarregar. Tente novamente."

#### Scenario: Falha do polling automático
- **WHEN** uma tentativa do polling automático de fallback falha
- **THEN** nenhuma mensagem é exibida e a lista atual permanece
