# Spec Delta

## MODIFIED Requirements

### Requirement: Atualização em tempo real sem expor dados
O contador e a lista SHALL atualizar sem recarregar a página. O Realtime do Supabase, acessível com a chave pública, SHALL ser usado somente como aviso de que algo mudou para aquele usuário, sem transportar título, texto ou outro conteúdo de notificação; ao receber o aviso, o frontend SHALL buscar os dados pela API autenticada, isolada por usuário. Se o Realtime falhar, o frontend SHALL atualizar por consulta periódica a cada 60 s, pausada quando `document.hidden` for verdadeiro. Ao retornar ao primeiro plano (visibilitychange para visible ou evento focus da janela), o frontend SHALL fazer uma única busca imediata e ignorar chamadas adicionais em menos de 5 s.

#### Scenario: Nova notificação chega
- **WHEN** uma notificação é criada para o usuário logado
- **THEN** o contador e a lista são atualizados em segundos, sem recarregar a página

#### Scenario: Realtime indisponível
- **WHEN** a conexão em tempo real não está disponível
- **THEN** o contador e a lista continuam sendo atualizados por consulta periódica a cada 60 s

#### Scenario: Aba oculta não faz consultas
- **WHEN** `document.hidden` é verdadeiro
- **THEN** o polling está suspenso e nenhuma requisição automática de notificações é feita

#### Scenario: Dois eventos ao voltar à janela
- **WHEN** focus e visibilitychange disparam simultaneamente ao voltar à janela
- **THEN** apenas uma consulta é feita, e chamadas subsequentes dentro de 5 s são ignoradas

#### Scenario: Conteúdo de outro usuário
- **WHEN** um cliente conectado ao Realtime com a chave pública observa os eventos
- **THEN** não recebe título, texto nem ação de nenhuma notificação, de nenhum usuário
