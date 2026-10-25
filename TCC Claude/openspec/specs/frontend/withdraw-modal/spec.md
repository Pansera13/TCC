# Spec: frontend/withdraw-modal

## Purpose
Allow a user to record the removal of a quantity from a product's stock, validating that the withdrawal does not exceed the available quantity.

## Requirements

### Requirement: Product info display
The modal SHALL display a read-only info block showing the product name and available quantity as `{parseFloat(product.quantidade)} {product.unidade}`.

#### Scenario: Product info visible
- **WHEN** the modal opens for a product named "Café" with `quantidade: 10` and `unidade: 'KG'`
- **THEN** the info block shows "Café" and "Disponível: 10 KG"

### Requirement: Quantity input
A decimal-only input (`inputMode="decimal"`) SHALL be auto-focused on open. It SHALL accept only the pattern `/^\d*\.?\d*$/`. The placeholder SHALL show `Máx: {parseFloat(product.quantidade)}`.

#### Scenario: Non-numeric input rejected
- **WHEN** the user types letters in the quantity field
- **THEN** the value does not change

### Requirement: Client-side validation
On submit the component SHALL validate: quantity is non-empty and > 0 (error: "Informe uma quantidade válida maior que zero."); quantity does not exceed `parseFloat(product.quantidade)` (error: "Quantidade maior que o estoque disponível ({qty} {unidade}).").

#### Scenario: Withdrawal exceeds stock
- **WHEN** the product has `quantidade: 5` and the user enters `7`
- **THEN** "Quantidade maior que o estoque disponível (5 UN)." is shown and no API call is made

#### Scenario: Zero quantity
- **WHEN** the user submits `0`
- **THEN** "Informe uma quantidade válida maior que zero." is shown

### Requirement: API call
On valid submit the component SHALL call `withdrawProduct(product.id, qty)`. On success it SHALL call `onWithdrawn(qty)` and `onClose()`. On error it SHALL display the API error and call `onError?.()`.

#### Scenario: Successful withdrawal
- **WHEN** `qty = 3` and the product has `quantidade: 10`
- **THEN** `onWithdrawn(3)` is called and the parent decrements the local quantity

#### Scenario: API error during withdrawal
- **WHEN** the API returns an error
- **THEN** the error message is shown and `onError` is called to trigger a full refresh

### Requirement: Confirm button styling
The "Confirmar Retirada" button SHALL use red styling (`bg-red-500 hover:bg-red-600`).

#### Scenario: Red button rendered
- **WHEN** the modal is open
- **THEN** the submit button has red background styling

### Requirement: Dismiss behaviour
Pressing `Escape`, clicking the overlay, or clicking `✕` SHALL call `onClose()`.

#### Scenario: Escape key closes modal
- **WHEN** the user presses Escape
- **THEN** `onClose()` is called
