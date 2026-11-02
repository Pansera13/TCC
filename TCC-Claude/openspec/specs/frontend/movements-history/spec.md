# Spec: frontend/movements-history

## Purpose
Display a paginated, filterable, sortable table of all stock movements for the company, with optional restriction to the current user's own movements based on permissions.

## Requirements

### Requirement: Permission-based scope
If `can('movimentacao:ver-todas')` is false the component SHALL display "Mostrando apenas as suas movimentações." and SHALL NOT render the user filter dropdown.

#### Scenario: User without full visibility
- **WHEN** `can('movimentacao:ver-todas')` is false
- **THEN** the user dropdown is hidden and the API returns only the current user's movements

### Requirement: Filter bar
The filter bar SHALL contain: user selector (only if `can('movimentacao:ver-todas')`), action type selector (`entrada`/`saida`/`edicao`/`remocao`), product search (debounced 300 ms), date start, date end, mobile sort selector, Limpar button, and Atualizar button. Any filter change SHALL reset page to 1.

#### Scenario: Filtering by action type
- **WHEN** the user selects "Retirada" in the action filter
- **THEN** the API is called with `tipo=saida` and only withdrawal movements are shown

#### Scenario: Limpar button resets all filters
- **WHEN** some filters are active and the user clicks "Limpar"
- **THEN** all filter fields reset to empty and the API is called with no filters

### Requirement: Invalid date range
If `filtros.from > filtros.to` both set, the component SHALL show "A data final deve ser igual ou posterior à data inicial." and SHALL NOT make an API request.

#### Scenario: End date before start date
- **WHEN** `from = '2025-10-20'` and `to = '2025-10-10'`
- **THEN** the error message is shown and no fetch is triggered

### Requirement: Server-side fetching
The component SHALL call `GET /api/movements` with params `{ page, pageSize, ...activeFilters, orderBy, orderDir }` whenever the composite key changes. `pageSize` is computed by `useFitRows`. The loading state is derived: `loading = resp.key !== currentKey && !periodoInvalido`.

#### Scenario: Fetch on filter change
- **WHEN** the user changes the date start filter
- **THEN** the API is called with the new filter and the page resets to 1

### Requirement: Table columns
The table SHALL have columns: Data/Hora (formatted `DD/MM/YYYY HH:MM`), Produto, Ação (badge), Quantidade, Origem (≥850 px), Responsável (≥1100 px). All columns SHALL be sortable via `SortTh`. Default sort is `created_at DESC`.

#### Scenario: Columns hidden on narrow screen
- **WHEN** the viewport is narrower than 850 px
- **THEN** the Origem column is hidden

### Requirement: Action badge colours
Entrada SHALL use green; Saída red; Edição amber; Remoção slate. Unknown types use grey.

#### Scenario: Entry badge is green
- **WHEN** a movement has `tipo: 'entrada'`
- **THEN** the badge uses green background and text

### Requirement: Edition detail expand
For `edicao` movements with a `detalhes` object, a "Detalhes"/"Ocultar" toggle SHALL appear. Clicking it expands a sub-row listing changed fields as `FieldName: old → new`. Only one row may be expanded at a time.

#### Scenario: Expanding edit details
- **WHEN** the user clicks "Detalhes" on an `edicao` row
- **THEN** an inline sub-row appears listing each changed field with before/after values

#### Scenario: Single expand at a time
- **WHEN** the user expands row A then clicks "Detalhes" on row B
- **THEN** row A collapses and row B expands

### Requirement: Pagination
The `Pagination` component SHALL render when `dados.total > 0`. Page navigation SHALL reset the expanded detail row.

#### Scenario: Pagination hides when single page
- **WHEN** total results fit in one page
- **THEN** the Pagination component is not rendered

### Requirement: Origin badge
`pedido` origin SHALL use blue; `estoque` origin grey. The Responsável column shows "Sistema de Pedidos" for `pedido` origin.

#### Scenario: Pedido origin
- **WHEN** a movement has `origem: 'pedido'`
- **THEN** the origin badge is blue and Responsável shows "Sistema de Pedidos"
