# Spec Delta

## Purpose

Transforma a aba Movimentações em um histórico de auditoria das ações de estoque, registrando quem fez o quê, em qual produto e quando, com filtros e paginação.

## ADDED Requirements

### Requirement: Registro de edição de produto
Ao salvar a edição de um produto com alteração em pelo menos um campo, o sistema SHALL registrar uma movimentação do tipo edição com usuário, produto, data e hora e os valores anteriores e novos dos campos alterados. Salvar sem alterações SHALL NOT gerar registro.

#### Scenario: Edição de nome e quantidade
- **WHEN** um administrador altera o nome e a quantidade de um produto e salva
- **THEN** o histórico ganha um registro de edição com o usuário, o produto e os valores antes e depois

#### Scenario: Salvar sem mudar nada
- **WHEN** um administrador abre a edição e salva sem alterar nenhum campo
- **THEN** nenhum registro é criado

### Requirement: Remoção de produto com registro
O sistema SHALL permitir que administradores removam um produto, pedindo confirmação, e SHALL registrar uma movimentação do tipo remoção que preserva o nome do produto. Usuários que não são administradores SHALL receber recusa. A remoção SHALL ser recusada com mensagem clara quando o produto estiver vinculado a um pedido.

#### Scenario: Remoção bem-sucedida
- **WHEN** um administrador confirma a remoção de um produto sem pedidos
- **THEN** o produto some da lista e o histórico mostra um registro de remoção com o nome do produto

#### Scenario: Produto vinculado a pedido
- **WHEN** um administrador tenta remover um produto que consta em um pedido
- **THEN** o produto é mantido, nenhum registro de remoção é criado e a interface informa que o produto está em uso por pedidos

#### Scenario: Usuário sem permissão
- **WHEN** um usuário que não é administrador tenta remover um produto
- **THEN** o sistema recusa a ação e o produto é mantido

### Requirement: Conteúdo de cada registro do histórico
Cada registro SHALL exibir quem realizou a ação (ou "Sistema de Pedidos" quando vier de pedido), o tipo da ação (entrada, retirada, edição ou remoção), o produto, a quantidade, a data e a hora. Para edições, o registro SHALL permitir ver os valores alterados.

#### Scenario: Registro de retirada
- **WHEN** um usuário retira 5 unidades de um produto
- **THEN** o histórico mostra o usuário, "Retirada", o produto, a quantidade 5 e a data e hora da ação

#### Scenario: Registro vindo do sistema de pedidos
- **WHEN** um pedido pago gera uma saída
- **THEN** o histórico mostra a origem Pedido e o responsável "Sistema de Pedidos"

### Requirement: Filtros do histórico
O histórico SHALL poder ser filtrado por usuário, tipo de ação, produto (por trecho do nome) e período (data inicial e final), com filtros combináveis. Alterar um filtro SHALL levar o histórico à página 1.

#### Scenario: Filtro combinado
- **WHEN** o usuário escolhe o tipo "Retirada" e um período de 7 dias
- **THEN** o histórico lista apenas retiradas dos últimos 7 dias

#### Scenario: Limpar filtros
- **WHEN** o usuário limpa os filtros
- **THEN** o histórico volta a listar todos os registros

#### Scenario: Nenhum resultado
- **WHEN** os filtros não correspondem a nenhum registro
- **THEN** a interface exibe uma mensagem de que nada foi encontrado

### Requirement: Ordenação e paginação do histórico
O histórico SHALL listar os registros do mais recente para o mais antigo e SHALL ser paginado, sem o limite fixo de 500 linhas, com indicação da página atual e do total de páginas.

#### Scenario: Histórico maior que uma página
- **WHEN** existem mais registros do que cabem em uma página
- **THEN** a primeira página traz os mais recentes e o usuário alcança os mais antigos pelos controles de página

### Requirement: Compatibilidade com o sistema de Pedidos
Os registros existentes e os gerados pelo sistema de Pedidos (entrada e saída) SHALL continuar válidos e visíveis, sem alteração de significado.

#### Scenario: Registros anteriores à mudança
- **WHEN** o histórico é aberto após a mudança
- **THEN** todas as entradas e saídas anteriores aparecem com os mesmos dados de antes
