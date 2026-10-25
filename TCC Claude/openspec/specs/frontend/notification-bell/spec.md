# Spec: frontend/notification-bell

## Purpose
Display a bell icon in TopNav that shows a badge for unread notifications and a dropdown list with dismiss and action capabilities, kept in sync via Supabase Realtime, periodic polling, and visibility events.

## Requirements

### Requirement: Bell button
The bell button SHALL render a SVG bell icon. When `naoLidas > 0` a red badge SHALL appear at top-right showing the count (capped at "9+" for > 9). The `aria-label` SHALL include the unread count when non-zero.

#### Scenario: Badge shows unread count
- **WHEN** there are 3 unread notifications
- **THEN** the badge shows "3"

#### Scenario: Badge caps at 9+
- **WHEN** there are 12 unread notifications
- **THEN** the badge shows "9+"

### Requirement: Notification loading
The component SHALL load notifications via `GET /api/notificacoes` triggered by: mount, `recarregarEm` prop change, Supabase Realtime event on `notificacoes_aviso` filtered to `usuario_id`, a 60 000 ms interval, `visibilitychange` to visible, and `window.focus`.

#### Scenario: Auto-refresh on tab focus
- **WHEN** the user switches back to the tab
- **THEN** `GET /api/notificacoes` is called to refresh the count

### Requirement: Unread count management
When dropdown is closed, `naoLidas` reflects `data.nao_lidas`. When dropdown is open, incoming API responses SHALL set `naoLidas` to 0.

#### Scenario: Count zeroed when dropdown is open
- **WHEN** a new notification arrives while the dropdown is open
- **THEN** `naoLidas` remains 0

### Requirement: Opening the dropdown
Clicking the bell SHALL toggle the dropdown. When opening with `naoLidas > 0` the component SHALL set `naoLidas` to 0 optimistically, mark all local items as read, and call `POST /api/notificacoes/marcar-lidas`.

#### Scenario: User opens bell with unread items
- **WHEN** the bell has 3 unread notifications and the user clicks it
- **THEN** the badge disappears immediately and the API is called to persist the reads

### Requirement: Dropdown content
When open the dropdown SHALL list all notifications with: `n.titulo` (bold), `n.texto` (smaller), an action button if `ACOES[n.acao]` is defined, and a `✕` dismiss button. An empty list shows "Nenhuma notificação".

#### Scenario: Empty notification list
- **WHEN** there are no notifications
- **THEN** "Nenhuma notificação" is shown in the dropdown

#### Scenario: Action button renders for known action
- **WHEN** a notification has `acao: 'abrir-email-recuperacao'`
- **THEN** a "Cadastrar agora" button appears in that notification item

### Requirement: Action button behaviour
Clicking an action button SHALL close the dropdown and call `onAcao(n.acao)`.

#### Scenario: Email recovery action
- **WHEN** the user clicks "Cadastrar agora" on a notification with `acao: 'abrir-email-recuperacao'`
- **THEN** the dropdown closes and `onAcao('abrir-email-recuperacao')` is called

### Requirement: Dismissing a notification
Clicking `✕` SHALL remove the item from local state optimistically and call `POST /api/notificacoes/:id/dispensar`. If the call fails the full list SHALL be reloaded.

#### Scenario: Successful dismiss
- **WHEN** the user clicks `✕` on a notification
- **THEN** the notification disappears immediately from the list

#### Scenario: Dismiss fails
- **WHEN** the `dispensar` API call fails
- **THEN** the notification list is refreshed from the server

### Requirement: Click-outside close
When the dropdown is open a `mousedown` listener SHALL close it when the click is outside the component root. On close `abertoRef.current` is set to `false`.

#### Scenario: Click outside closes dropdown
- **WHEN** the dropdown is open and the user clicks elsewhere on the page
- **THEN** the dropdown closes

### Requirement: Supabase Realtime cleanup
The Supabase channel SHALL be removed when `usuarioId` changes or the component unmounts.

#### Scenario: Component unmounts
- **WHEN** the user logs out and the component unmounts
- **THEN** `supabase.removeChannel` is called to clean up the subscription
