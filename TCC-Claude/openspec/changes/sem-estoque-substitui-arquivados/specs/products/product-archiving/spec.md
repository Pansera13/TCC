# Spec Delta

## ADDED Requirements

### Requirement: Arquivar somente pelo servidor
O servidor SHALL manter a operação de arquivar disponível ao Sócio e ao Administrador, e o produto arquivado SHALL permanecer no banco com todo o histórico de movimentações, fora do estoque ativo. A interface SHALL NOT oferecer a ação de arquivar nem uma visão de produtos arquivados: a área separada de produtos é a aba Sem estoque (quantidade zero). O Sócio SHALL continuar sem poder excluir produtos.

#### Scenario: Interface não oferece arquivar
- **WHEN** um Sócio ou Administrador abre o modal de edição de um produto
- **THEN** não existe a ação "Arquivar produto", e o menu não tem uma aba de arquivados

#### Scenario: Arquivar pela API
- **WHEN** um Sócio chama a rota de arquivar de um produto
- **THEN** o produto fica arquivado, sai das listas e dos totais, e o histórico de movimentações é preservado

#### Scenario: Sócio tenta excluir
- **WHEN** um Sócio chama a exclusão definitiva de um produto
- **THEN** o servidor responde 403

#### Scenario: Funcionário tenta arquivar
- **WHEN** um Funcionário chama a rota de arquivar
- **THEN** o servidor responde 403

## REMOVED Requirements

### Requirement: Arquivar produto
**Reason**: A interface deixou de oferecer o arquivamento. O requisito é substituído por "Arquivar somente pelo servidor", que mantém o comportamento da API e registra que a interface não o expõe.
**Migration**: Ver o requisito "Arquivar somente pelo servidor" desta mesma spec. Para tirar um produto de uso, o caminho na interface é a aba Sem estoque (quantidade zero) ou, para o Administrador, a exclusão definitiva.

### Requirement: Visão Arquivados do Administrador
**Reason**: A aba Arquivados foi substituída pela aba Sem estoque, que lista automaticamente os produtos com quantidade zero para todos os cargos (ver `dashboard/out-of-stock-view`).
**Migration**: Administradores usam a aba Sem estoque para os produtos zerados e o modal de edição para excluir definitivamente. Produtos já arquivados no banco continuam arquivados e, se necessário, podem ser desarquivados por SQL (ver `design.md` desta change).
