# Spec Delta

## ADDED Requirements

### Requirement: 429 central handling
O interceptor de resposta SHALL tratar respostas HTTP 429. Chamadas disparadas por polling automático (notificações, produtos) SHALL ser adiadas pelo valor de `retry_after` (em segundos) da resposta antes de serem executadas novamente. Chamadas disparadas por ação direta do usuário SHALL rejeitar o erro imediatamente sem repetição. O aviso SHALL reutilizar o componente/estilo de aviso já existente no sistema, sem criar elementos visuais novos.

#### Scenario: Polling recebe 429
- **WHEN** uma chamada de polling automático recebe HTTP 429 com `retry_after: 30`
- **THEN** a chamada não é repetida imediatamente e fica suprimida por ao menos 30 segundos antes de poder tentar novamente

#### Scenario: Ação do usuário recebe 429
- **WHEN** uma ação direta do usuário (ex.: confirmar retirada) recebe HTTP 429
- **THEN** o erro é rejeitado imediatamente para o chamador tratar, sem repetição automática

#### Scenario: Aviso de 429 não cria elementos visuais novos
- **WHEN** um 429 é recebido e um aviso é exibido
- **THEN** o aviso usa o componente ou estilo de aviso já existente na interface, sem adicionar novos elementos de UI

### Requirement: Batch product import function
O módulo SHALL exportar `importProductsBatch(itens)` que faz `POST /api/products/lote` com o corpo `{ itens }` e retorna a resposta.

#### Scenario: Chamada do endpoint em lote
- **WHEN** `importProductsBatch([{ nome: 'A', quantidade: 5, unidade: 'UN' }])` é chamado
- **THEN** uma requisição POST é feita a `/api/products/lote` com `{ itens: [{ nome: 'A', quantidade: 5, unidade: 'UN' }] }`
