# Spec: frontend/reports

## Purpose
Display inventory KPI cards and movement analytics for a selected time window, and allow export to CSV.

## Requirements

### Requirement: Period selector
The component SHALL render four preset buttons: "7 dias", "30 dias", "90 dias", and "Personalizado". The default SHALL be "30 dias". When "Personalizado" is active, start and end date inputs SHALL appear.

#### Scenario: Default period is 30 days
- **WHEN** the Reports tab first loads
- **THEN** the "30 dias" button is highlighted and the API is called for the last 30 days

#### Scenario: Selecting custom period
- **WHEN** the user selects "Personalizado" and fills both dates
- **THEN** the API is called with the exact dates provided

### Requirement: Invalid period validation
If custom period has `to < from`, the component SHALL show "A data final deve ser igual ou posterior à data inicial." and SHALL NOT make an API request.

#### Scenario: Invalid custom period
- **WHEN** `from = '2025-10-20'` and `to = '2025-10-10'`
- **THEN** the error message is shown and no API call is made

### Requirement: Data fetching
The component SHALL call `GET /api/reports?from=...&to=...` when the effective period changes. The request SHALL be cancelled if the period changes before it resolves. During loading a spinner screen shows; subsequent re-fetches dim existing data.

#### Scenario: Loading state on first load
- **WHEN** the component has no data yet and is fetching
- **THEN** a pulsing chart emoji and "Carregando relatório…" are displayed

#### Scenario: Re-fetch dims existing data
- **WHEN** the user changes the period while data is already displayed
- **THEN** the existing data becomes semi-transparent while the new data loads

### Requirement: KPI cards
When data is loaded the component SHALL render 5 gradient cards: Total de produtos (purple), Estoque baixo (yellow-orange), Esgotados (red), Entradas no período (green), Saídas no período (blue). Values SHALL use Brazilian locale with at most 1 decimal.

#### Scenario: KPI cards render after load
- **WHEN** the API responds with summary data
- **THEN** all 5 coloured KPI cards render with correct values

### Requirement: Top 10 most withdrawn
A table titled "Top 10 mais retirados" SHALL show rank, product name, and quantity withdrawn. If no withdrawals occurred the body shows "Nenhuma retirada no período."

#### Scenario: Empty top-10 table
- **WHEN** there are no withdrawals in the period
- **THEN** "Nenhuma retirada no período." is shown instead of table rows

### Requirement: Consumption by category
A table titled "Consumo por categoria" SHALL show category name and withdrawn quantity.

#### Scenario: Category consumption data
- **WHEN** the API returns `consumoPorCategoria` with entries
- **THEN** each row shows category name and quantity

### Requirement: Stock turnover table
A paginated table titled "Giro de estoque por produto" SHALL show product name, current stock (with unit), quantity withdrawn, and turnover ratio (withdrawn ÷ estoque; `—` when estoque is 0). Pagination uses `TABLE_PAGE_SIZE` (12).

#### Scenario: Zero stock shows dash for turnover
- **WHEN** a product has estoque `0`
- **THEN** the Giro column shows `—`

### Requirement: Export CSV
The "Exportar CSV" button SHALL be enabled only when data is loaded, loading is false, and the period is valid. Clicking it SHALL call `downloadReportCsv(dados)`.

#### Scenario: Export CSV
- **WHEN** data is loaded and the user clicks "Exportar CSV"
- **THEN** `downloadReportCsv` is called and the browser downloads a file

#### Scenario: Export disabled during load
- **WHEN** the report is loading
- **THEN** the "Exportar CSV" button is disabled
