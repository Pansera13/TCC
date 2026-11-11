# Spec Delta

## MODIFIED Requirements

### Requirement: Navigation tab filtering
Only tabs for which the user has the required permission SHALL appear in `TopNav`. Tabs with no `permissao` (Início, Produtos, Movimentações, Sem estoque) are always shown. Relatórios requires `relatorio:ver`.

#### Scenario: Funcionário sees limited nav
- **WHEN** a user lacks `relatorio:ver`
- **THEN** only Início, Produtos, Movimentações, and Sem estoque appear in `TopNav`

## REMOVED Requirements

### Requirement: Lazy data loading
**Reason**: The two data sets this requirement covered no longer exist in the interface: Equipe was removed in an earlier change, and Arquivados is replaced by the Sem estoque tab, which is derived from the product list already loaded.
**Migration**: None. Sem estoque needs no extra request; it filters the products already in memory.
