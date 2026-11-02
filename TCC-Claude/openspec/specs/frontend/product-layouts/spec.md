# Spec: frontend/product-layouts

## Purpose
Define the four interchangeable product display layouts and three size presets in the Produtos tab, along with the shared toolbar and per-category pagination.

## Requirements

### Requirement: Layout options
Four layout modes SHALL be supported: `lista` (collapsible table per category), `acordeao` (chip buttons toggle category tables), `grade` (product cards in a grid), and `compacto` (compact mini-cards with icon buttons). Only the active layout is rendered.

#### Scenario: Switching to Grade layout
- **WHEN** the user selects "Grade" in the layout picker
- **THEN** products are displayed as cards in a responsive grid

### Requirement: Size presets
Three size presets SHALL be available: Pequeno (`p`), Médio (`m`), Grande (`g`). They affect table row padding, font size, card padding, and grid column counts. Médio is the default.

#### Scenario: Large size increases font
- **WHEN** the user selects "Grande"
- **THEN** table text uses `text-base` and cards use larger fonts and padding

### Requirement: Preference persistence
Selected layout SHALL be read from `localStorage.sf_layout` on mount (default `'lista'`) and written on change. Selected size SHALL be read from `localStorage.sf_tamanho` on mount (default `'m'`) and written on change.

#### Scenario: User reloads the page
- **WHEN** the user had selected "Grade" and "Grande" before reload
- **THEN** the Produtos tab opens with Grade layout at Grande size

### Requirement: Layout/size picker
A dropdown button showing the current layout icon and name SHALL open a panel with a 2×2 grid of layout buttons (icon, name, description) and three size buttons. The active layout and size SHALL be highlighted in purple. Clicking outside closes the panel.

#### Scenario: Active layout highlighted
- **WHEN** `lista` is the current layout
- **THEN** the Lista button has purple border and background in the picker

### Requirement: Toolbar
The toolbar SHALL include (in order): search input (clears category filter and resets per-category pages), category filter select, layout picker, RecarregarProdutos, and "+ Novo produto" button (only if `can('produto:cadastrar')`).

#### Scenario: Search clears category filter
- **WHEN** a category filter is active and the user types in the search box
- **THEN** the category filter resets to "Todas as categorias"

#### Scenario: Add product button hidden without permission
- **WHEN** `can('produto:cadastrar')` is false
- **THEN** the "+ Novo produto" button is not rendered

### Requirement: Product grouping
Products SHALL be grouped by `categoria` using `groupProductsByCategory`. "Sem Categoria" SHALL appear last. When a category filter is active only that group is shown.

#### Scenario: Category filter shows only matching group
- **WHEN** the user selects "Limpeza" in the category filter
- **THEN** only products with `categoria: 'Limpeza'` are shown

### Requirement: Per-category pagination
Each category group SHALL be independently paginated with `PRODUCTS_PAGE_SIZE` (15) per page. All pages reset to 1 when sorting changes or a search is performed.

#### Scenario: Category with 20 products paginates
- **WHEN** a category has 20 products and size is 15
- **THEN** the category shows a Pagination control with 2 pages

### Requirement: Sorting
Products within each category SHALL be sortable by any table column via `SortTh`. Clicking a column cycles: ascending → descending → none.

#### Scenario: Sort by name ascending
- **WHEN** the user clicks the "Nome" column header once
- **THEN** products within each category are sorted A–Z

### Requirement: Action buttons
Every product card/row SHALL display: Retirar (red, disabled if qty = 0), Entrada (green, always enabled), Editar (grey, only if `can('produto:editar')`). Compacto uses `−`, `+`, `✏️` as icon-only labels.

#### Scenario: Retirar disabled when out of stock
- **WHEN** `parseFloat(p.quantidade) === 0`
- **THEN** the Retirar button is disabled and visually dimmed

#### Scenario: Editar hidden without permission
- **WHEN** `can('produto:editar')` is false
- **THEN** the Editar button is not rendered in any layout

### Requirement: Quantity colour coding
Quantity SHALL be red+bold when `= 0`, yellow+bold when `> 0 and ≤ 3`, grey otherwise.

#### Scenario: Zero stock is red
- **WHEN** a product has `quantidade: 0`
- **THEN** the displayed quantity uses red text

#### Scenario: Low stock is yellow
- **WHEN** a product has `quantidade: 2`
- **THEN** the displayed quantity uses yellow text

### Requirement: Empty states
When no products match the search the component SHALL show "Nenhum produto encontrado para "{search}".". When there are no products at all a "Nenhum produto cadastrado ainda." message with "+ Adicionar primeiro produto" SHALL be shown.

#### Scenario: No products found for search
- **WHEN** the search term matches no product names
- **THEN** the empty-state message is shown instead of product cards

### Requirement: Lista layout collapsibility
In Lista layout each category header row SHALL toggle visibility of the table inside on click.

#### Scenario: Collapse category in Lista
- **WHEN** the user clicks a category header that is expanded
- **THEN** the table inside collapses

### Requirement: Grade layout card content
Each Grade card SHALL show product name (bold, wrapping), quantity (large, colour-coded), unit, supplier (if present, truncated), and action buttons at the bottom.

#### Scenario: Grade card shows supplier
- **WHEN** a product has `fornecedor: 'ABC Ltda'`
- **THEN** the grade card displays "ABC Ltda" below the quantity

### Requirement: Compacto layout card content
Each Compacto card SHALL show product name (max 2 lines, centred), quantity (centred, colour-coded), unit, and icon buttons (`−`, `+`, `✏️`).

#### Scenario: Compacto card shows icon buttons
- **WHEN** the Compacto layout is active
- **THEN** each card shows `−`, `+`, and (if permitted) `✏️` buttons instead of labels
