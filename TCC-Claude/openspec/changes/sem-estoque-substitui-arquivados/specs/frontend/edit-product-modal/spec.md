# Spec Delta

## MODIFIED Requirements

### Requirement: Access control
The modal SHALL only be opened by code that checks `can('produto:editar')`. The modal itself reads `can('produto:excluir')` to conditionally render the delete section.

#### Scenario: User without edit permission
- **WHEN** `can('produto:editar')` is false
- **THEN** the "Editar" button is not rendered in any product layout

### Requirement: Delete action
If `can('produto:excluir')` is true, an "Excluir definitivamente" link SHALL appear. Clicking it starts a two-step confirmation (excluir-1 → excluir-2). Only on "Sim, excluir definitivamente" SHALL `deleteProduct(id)` be called.

#### Scenario: Permanent delete confirmation
- **WHEN** the user completes both delete confirmation steps and clicks "Sim, excluir definitivamente"
- **THEN** `deleteProduct(id)` is called and on success the modal closes

## REMOVED Requirements

### Requirement: Archive action
**Reason**: The interface no longer offers archiving. Products with zero quantity are listed automatically in the Sem estoque tab (see `dashboard/out-of-stock-view`).
**Migration**: Use the Sem estoque tab for zero-stock products. Administrators can still remove a product permanently with the delete action.

### Requirement: Mutual exclusion of confirmations
**Reason**: With the archive confirmation gone, the delete confirmation is the only one left, so there is nothing to exclude.
**Migration**: None.
