# Spec: frontend/dashboard-layout

## Purpose
Define the overall visual structure of the Dashboard page: a fixed top navigation bar, an independently scrollable main content area, a gradient background, and a dark-mode system.

## Requirements

### Requirement: Full-viewport non-scrolling shell
The Dashboard root element SHALL occupy exactly the viewport height (`h-screen`) with `overflow: hidden` so that scrolling is confined to the main content area. The layout SHALL be a vertical flex column: `TopNav` at the top (`shrink-0`) and `<main>` filling the remaining space (`flex-1 overflow-auto`).

#### Scenario: Page does not scroll as a whole
- **WHEN** the products list exceeds the viewport height
- **THEN** only the `<main>` area scrolls and the `TopNav` remains fixed at the top

### Requirement: Background gradient
The background SHALL be a diagonal gradient (`bg-gradient-to-br`). In light mode: `from-white via-white to-[#E879F9]/30`. In dark mode: `from-black via-[#2e1065] to-[#7C3AED]`. Transitions SHALL be smooth (`transition-colors duration-500`).

#### Scenario: Dark mode gradient
- **WHEN** `darkMode` is true
- **THEN** the background ends with the purple `#7C3AED` tone

### Requirement: TopNav bar
`TopNav` SHALL receive `items`, `activeNav`, `onSelect`, `user`, `darkMode`, `onToggleDark`, and all profile-menu control props. It SHALL always be visible and SHALL NOT scroll out of view.

#### Scenario: TopNav stays visible on scroll
- **WHEN** the user scrolls down within the main content area
- **THEN** `TopNav` remains at the top of the viewport

### Requirement: Main content area
The `<main>` element SHALL have horizontal padding `px-3 sm:px-[3cm]`, top padding `pt-4 sm:pt-6`, and bottom padding `pb-[1cm]`. For table-based tabs (`dashboard`, `sem-estoque`, `equipe`, `movimentacoes`) the inner flex column SHALL be `h-full`; for others `min-h-full`.

#### Scenario: Table tab uses full height
- **WHEN** `activeNav === 'dashboard'`
- **THEN** the content flex column has `h-full` applied

#### Scenario: Products tab allows natural growth
- **WHEN** `activeNav === 'produtos'`
- **THEN** the content flex column has `min-h-full` applied

### Requirement: Navigation tab filtering
Only tabs for which the user has the required permission SHALL appear in `TopNav`. Tabs with no `permissao` (Início, Produtos, Movimentações) are always shown. Relatórios requires `relatorio:ver`; Arquivados requires `produto:ver-arquivados`; Equipe requires `equipe:ver`.

#### Scenario: Funcionário sees limited nav
- **WHEN** a user lacks `relatorio:ver`, `produto:ver-arquivados`, `equipe:ver`
- **THEN** only Início, Produtos, and Movimentações appear in `TopNav`

### Requirement: Lazy data loading
Equipe data SHALL NOT be fetched on mount. It SHALL be fetched when `activeNav === 'equipe'` and `usersLoaded` is false. Arquivados SHALL be fetched every time `activeNav === 'arquivados'`.

#### Scenario: First visit to Equipe tab
- **WHEN** the user clicks the Equipe tab for the first time
- **THEN** `GET /api/users` is called to load team data

### Requirement: Dark-mode toggle
The dark-mode toggle in `TopNav` SHALL call `setDarkMode(dm => !dm)`.

#### Scenario: Dark mode toggle from TopNav
- **WHEN** the user clicks the dark-mode toggle in `TopNav`
- **THEN** `setDarkMode` is invoked and the theme changes

### Requirement: Profile sync on mount
On mount the Dashboard SHALL call `GET /api/profile` and update the auth context with any changed `avatar_url`, `role`, or `permissoes`.

#### Scenario: Role changed server-side
- **WHEN** the server returns a different `role` than what is in sessionStorage
- **THEN** `updateUser({ role: newRole })` is called

### Requirement: Real-time product sync
The Dashboard SHALL subscribe to Supabase Realtime `postgres_changes` on the `products` table for INSERT, UPDATE, and DELETE events and update local state accordingly. It SHALL also poll `GET /api/products` every 20 000 ms. Both SHALL be cleaned up on unmount.

#### Scenario: Another user adds a product
- **WHEN** a Realtime INSERT event arrives for the `products` table
- **THEN** the new product is appended to the local list without a full page refresh

#### Scenario: Product archived by another user
- **WHEN** a Realtime UPDATE event arrives with `arquivado: true`
- **THEN** the product is removed from the active products list
