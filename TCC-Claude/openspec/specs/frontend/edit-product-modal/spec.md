# Spec: frontend/edit-product-modal

## Purpose
Allow authorised users to modify the details of an existing product and optionally archive or permanently delete it, with two-step confirmation for destructive actions.

## Requirements

### Requirement: Access control
The modal SHALL only be opened by code that checks `can('produto:editar')`. The modal itself reads `can('produto:arquivar')` and `can('produto:excluir')` to conditionally render archive and delete sections.

#### Scenario: User without edit permission
- **WHEN** `can('produto:editar')` is false
- **THEN** the "Editar" button is not rendered in any product layout

### Requirement: Initial values
On mount the form SHALL be pre-populated with the product's `nome`, `quantidade` (via `parseFloat`), `unidade`, `categoria` (empty string if absent), and `fornecedor` (empty string if absent).

#### Scenario: Pre-populated form
- **WHEN** the modal opens for a product with `categoria: 'Limpeza'`
- **THEN** the categoria field shows `'Limpeza'`

### Requirement: Form fields
The form SHALL contain `nome` (required text), `quantidade` (required decimal ≥ 0), `unidade` (required select: UN/KG/L/CX), `categoria` (optional with datalist), `fornecedor` (optional text). Non-numeric characters SHALL be rejected in the quantity field.

#### Scenario: Quantity rejects letters
- **WHEN** the user types `abc` in the quantity field
- **THEN** the value does not change

### Requirement: Validation
Before submitting the component SHALL validate: `nome` non-empty; `quantidade` non-empty and ≥ 0; `unidade` selected. Per-field errors appear inline; a `_global` error appears at the top for API errors.

#### Scenario: Empty name
- **WHEN** the user clears the name field and submits
- **THEN** "Nome é obrigatório." appears and no API call is made

### Requirement: Save action
On valid submit the component SHALL `PUT /api/products/:id` with trimmed nome, parseFloat quantidade, unidade, and nullable categoria/fornecedor. On success `onSaved()` then `onClose()` are called.

#### Scenario: Successful edit
- **WHEN** all fields are valid and the API responds with 2xx
- **THEN** `onSaved()` is called to refresh the product list and the modal closes

### Requirement: Archive action
If `can('produto:arquivar')` is true and no delete confirmation is active, an "Arquivar produto" link SHALL appear. Clicking it starts a two-step confirmation (arquivar-1 → arquivar-2). Only on "Confirmar arquivamento" in step 2 SHALL `archiveProduct(id)` be called.

#### Scenario: Archive two-step confirmation
- **WHEN** the user clicks "Arquivar produto" then "Sim, continuar"
- **THEN** the second confirmation panel appears

#### Scenario: Archive cancellation
- **WHEN** the user clicks "Não" in the first archive confirmation step
- **THEN** the panel disappears and the form returns to normal

### Requirement: Delete action
If `can('produto:excluir')` is true and no archive confirmation is active, an "Excluir definitivamente" link SHALL appear. Clicking it starts a two-step confirmation (excluir-1 → excluir-2). Only on "Sim, excluir definitivamente" SHALL `deleteProduct(id)` be called.

#### Scenario: Permanent delete confirmation
- **WHEN** the user completes both delete confirmation steps and clicks "Sim, excluir definitivamente"
- **THEN** `deleteProduct(id)` is called and on success the modal closes

### Requirement: Mutual exclusion of confirmations
Archive and delete confirmation panels SHALL be mutually exclusive; when one is active the other is hidden.

#### Scenario: Archive active hides delete option
- **WHEN** `confirmacao === 'arquivar-1'`
- **THEN** the "Excluir definitivamente" link is not rendered

### Requirement: Dismiss behaviour
Pressing `Escape`, clicking the overlay background, or clicking `✕` SHALL call `onClose()`.

#### Scenario: Escape key closes modal
- **WHEN** the user presses Escape while the modal is open
- **THEN** `onClose()` is called
