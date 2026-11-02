# Spec: frontend/auth-context

## Purpose
Provide a React context that manages the authenticated session for the current browser tab, storing state in `sessionStorage` so that each tab maintains an independent session.

## Requirements

### Requirement: Storage backend
The context SHALL use `sessionStorage` to persist the token and user object, so that closing a tab ends its session. On module load the context SHALL silently remove `token` and `user` from `localStorage` to clean up legacy data.

#### Scenario: Each tab has independent session
- **WHEN** the user logs in on Tab A and opens Tab B
- **THEN** Tab B starts without a session until the user logs in there as well

#### Scenario: Legacy localStorage cleanup
- **WHEN** the module loads and `localStorage.token` exists from a previous version
- **THEN** `localStorage.token` and `localStorage.user` are removed

### Requirement: Initial state hydration
On mount `AuthProvider` SHALL initialise `user` by parsing `sessionStorage.getItem('user')`. If the item is absent or unparseable the initial value SHALL be `null`.

#### Scenario: Returning to dashboard after page reload
- **WHEN** `sessionStorage.user` contains a valid JSON user object
- **THEN** `user` is initialised to that object and the user is considered logged in

#### Scenario: First visit with no stored session
- **WHEN** `sessionStorage.user` is absent
- **THEN** `user` initialises to `null`

### Requirement: loginUser function
`loginUser(token, nome, role, id, avatar_url, permissoes)` SHALL construct a `userData` object with fields `nome`, `role` (defaulting to `'admin'` if falsy), `id`, `avatarUrl` (from `avatar_url`, null if absent), `permissoes` (defaulting to `[]`). It SHALL write the JWT to `sessionStorage.token`, the serialised `userData` to `sessionStorage.user`, and update React state.

#### Scenario: Successful login
- **WHEN** `loginUser` is called with valid arguments
- **THEN** `sessionStorage.token` contains the JWT and `user` in context is the new object

### Requirement: logoutUser function
`logoutUser()` SHALL remove both `'token'` and `'user'` from `sessionStorage` and set `user` to `null`.

#### Scenario: Logout clears session
- **WHEN** `logoutUser` is called
- **THEN** `sessionStorage.token` and `sessionStorage.user` are absent and `user` is `null`

### Requirement: updateUser function
`updateUser(fields)` SHALL merge `fields` into the current `user` object, persist the merged object to `sessionStorage.user`, and update React state.

#### Scenario: Updating avatar URL
- **WHEN** `updateUser({ avatarUrl: 'data:...' })` is called
- **THEN** `user.avatarUrl` reflects the new value and `sessionStorage.user` is updated accordingly

### Requirement: can function
`can(permissao)` SHALL return `true` if `user.permissoes` includes the given permission string, and `false` otherwise including when `user` is `null`.

#### Scenario: User has permission
- **WHEN** `user.permissoes` contains `'produto:editar'` and `can('produto:editar')` is called
- **THEN** the function returns `true`

#### Scenario: User lacks permission
- **WHEN** `user.permissoes` does not contain `'relatorio:ver'` and `can('relatorio:ver')` is called
- **THEN** the function returns `false`

#### Scenario: No user logged in
- **WHEN** `user` is `null` and `can('any:permission')` is called
- **THEN** the function returns `false`

### Requirement: Context shape
`AuthContext.Provider` SHALL expose `{ user, loginUser, logoutUser, updateUser, can }`. `useAuth()` SHALL be exported as a convenience hook that calls `useContext(AuthContext)`.

#### Scenario: Component consumes context
- **WHEN** a component calls `useAuth()`
- **THEN** it receives all five values: `user`, `loginUser`, `logoutUser`, `updateUser`, `can`
