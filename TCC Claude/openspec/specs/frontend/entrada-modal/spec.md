# Spec: frontend/entrada-modal

## Purpose
Allow a user to record the addition of a quantity to a product's stock.

## Requirements

### Requirement: Product info display
The modal SHALL display a read-only info block showing the product name and current stock as `{parseFloat(product.quantidade)} {product.unidade}`.

#### Scenario: Product info visible
- **WHEN** the modal opens for a product named "Arroz" with `quantidade: 50` and `unidade: 'KG'`
- **THEN** the info block shows "Arroz" and "Estoque atual: 50 KG"

### Requirement: Quantity input
A decimal-only input (`inputMode="decimal"`) SHALL be auto-focused. It SHALL accept only `/^\d*\.?\d*$/`. The placeholder SHALL be "Ex: 10".

#### Scenario: Non-numeric input rejected
- **WHEN** the user types `abc` in the quantity field
- **THEN** the value does not change

### Requirement: Client-side validation
On submit the component SHALL validate that quantity is non-empty and > 0. Error: "Informe uma quantidade válida maior que zero." There is no upper bound.

#### Scenario: Zero quantity rejected
- **WHEN** the user submits `0`
- **THEN** "Informe uma quantidade válida maior que zero." is shown and no API call is made

### Requirement: API call
On valid submit the component SHALL call `entryProduct(product.id, qty)`. On success it SHALL call `onEntered(qty)` and `onClose()`. On error it SHALL display the API error and call `onError?.()`.

#### Scenario: Successful entry
- **WHEN** the user enters `20` and the product has `quantidade: 5`
- **THEN** `onEntered(20)` is called and the parent adds 20 to the local quantity

#### Scenario: API error
- **WHEN** the API returns an error
- **THEN** the error message is shown and `onError` is called

### Requirement: Confirm button styling
The "Confirmar Entrada" button SHALL use green styling (`bg-green-600 hover:bg-green-700`).

#### Scenario: Green button rendered
- **WHEN** the modal is open
- **THEN** the submit button has green background styling

### Requirement: Dismiss behaviour
Pressing `Escape`, clicking the overlay, or clicking `✕` SHALL call `onClose()`.

#### Scenario: Overlay click closes modal
- **WHEN** the user clicks the dark overlay background
- **THEN** `onClose()` is called
