# Spec Delta

## Purpose

Central de notificações por usuário: lista avisos que permanecem visíveis até serem tratados, com contador de não lidas, atualização em tempo real e estrutura genérica para avisos futuros, começando pelo aviso para cadastrar o e-mail de recuperação.

## ADDED Requirements

### Requirement: Estrutura genérica de notificação

Cada notificação SHALL pertencer a um único usuário e ter tipo, título, texto, ação (o que acontece ao clicar), estado de lida, estado de dispensada e data de criação, de modo que novos tipos possam ser criados sem mudar o modelo. O sistema SHALL listar apenas notificações não dispensadas do usuário autenticado.

#### Scenario: Lista só do próprio usuário

- **WHEN** um usuário autenticado consulta suas notificações
- **THEN** recebe somente as suas notificações não dispensadas, da mais recente para a mais antiga, e o número de não lidas

#### Scenario: Acesso a notificação de outro usuário

- **WHEN** um usuário tenta marcar como lida ou dispensar uma notificação que pertence a outro usuário
- **THEN** o sistema responde HTTP 404 e nada é alterado

### Requirement: Lista, leitura e dispensa

A notificação SHALL aparecer na lista até ser tratada. Abrir a lista SHALL marcar todas como lidas e reduzir o contador a zero, sem removê-las. O "X" no canto superior direito de cada notificação SHALL dispensá-la e removê-la da lista. Clicar na ação da notificação SHALL executar a ação (para o e-mail de recuperação, abrir o formulário de cadastro) sem dispensar a notificação.

#### Scenario: Abrir a lista

- **WHEN** o usuário abre o menu de notificações com itens não lidos
- **THEN** os itens permanecem na lista, passam a lidos e o contador do sino vai a zero

#### Scenario: Dispensar

- **WHEN** o usuário clica no "X" de uma notificação
- **THEN** ela some da lista e não volta a aparecer, mesmo depois de recarregar a página

#### Scenario: Executar a ação

- **WHEN** o usuário clica na ação da notificação "Cadastre seu e-mail de recuperação"
- **THEN** o sistema abre o formulário do e-mail de recuperação e a notificação continua na lista até o e-mail ser cadastrado ou ela ser dispensada

#### Scenario: Lista vazia

- **WHEN** o usuário não tem notificações
- **THEN** o sino aparece normalmente, sem contador, e o menu mostra "Nenhuma notificação"

### Requirement: Notificação "Cadastre seu e-mail de recuperação"

O sistema SHALL criar a notificação do tipo "cadastrar e-mail de recuperação" uma única vez, por migração, somente para contas principais já existentes que não têm e-mail de recuperação. Contas novas informam o e-mail no cadastro e SHALL NOT receber essa notificação. Contas de equipe SHALL NOT receber essa notificação. Ao cadastrar o e-mail de recuperação, o sistema SHALL resolver a notificação automaticamente, removendo-a da lista.

#### Scenario: Conta antiga sem e-mail

- **WHEN** a migração roda e existe uma conta principal sem e-mail de recuperação
- **THEN** essa conta passa a ter exatamente uma notificação "Cadastre seu e-mail de recuperação" não lida

#### Scenario: Conta nova ou de equipe

- **WHEN** uma conta é criada pelo cadastro público ou por um administrador na aba Equipe
- **THEN** nenhuma notificação de e-mail de recuperação é criada para ela

#### Scenario: Resolução automática

- **WHEN** o dono da conta cadastra o e-mail de recuperação
- **THEN** a notificação some da lista e o contador é atualizado

#### Scenario: Migração repetida

- **WHEN** a migração é executada mais de uma vez
- **THEN** nenhuma conta ganha notificação duplicada

### Requirement: Atualização em tempo real sem expor dados

O contador e a lista SHALL atualizar sem recarregar a página. O Realtime do Supabase, acessível com a chave pública, SHALL ser usado somente como aviso de que algo mudou para aquele usuário, sem transportar título, texto ou outro conteúdo de notificação; ao receber o aviso, o frontend SHALL buscar os dados pela API autenticada, isolada por usuário. Se o Realtime falhar, o frontend SHALL atualizar por consulta periódica.

#### Scenario: Nova notificação chega

- **WHEN** uma notificação é criada para o usuário logado
- **THEN** o contador e a lista são atualizados em segundos, sem recarregar a página

#### Scenario: Realtime indisponível

- **WHEN** a conexão em tempo real não está disponível
- **THEN** o contador e a lista continuam sendo atualizados por consulta periódica

#### Scenario: Conteúdo de outro usuário

- **WHEN** um cliente conectado ao Realtime com a chave pública observa os eventos
- **THEN** não recebe título, texto nem ação de nenhuma notificação, de nenhum usuário
