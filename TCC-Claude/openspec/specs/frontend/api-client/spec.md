# Spec: frontend/api-client

## Purpose
Centralise all HTTP communication with the StockFlow backend through a single Axios instance, handling authentication headers and automatic session termination on 401 responses.

## Requirements

### Requirement: Base URL
The Axios instance SHALL use `import.meta.env.VITE_API_URL` as the base URL. If that variable is absent or empty the base URL SHALL fall back to an empty string `''` (making all paths relative to the page origin).

#### Scenario: VITE_API_URL configured
- **WHEN** `VITE_API_URL=https://api.example.com` and `listProducts()` is called
- **THEN** the request goes to `https://api.example.com/api/products`

#### Scenario: VITE_API_URL absent
- **WHEN** `VITE_API_URL` is not set and `listProducts()` is called
- **THEN** the request goes to `/api/products` (relative to the page origin)

### Requirement: Auth request interceptor
A request interceptor SHALL read `sessionStorage.getItem('token')`. If a token is present it SHALL attach `Authorization: Bearer <token>` to the request headers. If no token is stored no header is added.

#### Scenario: Authenticated request
- **WHEN** `sessionStorage.token` is set and any API function is called
- **THEN** the outgoing HTTP request includes the header `Authorization: Bearer <token>`

#### Scenario: Unauthenticated request
- **WHEN** `sessionStorage.token` is absent
- **THEN** no `Authorization` header is added

### Requirement: 401 response interceptor
A response interceptor SHALL perform automatic session teardown when all conditions are true: the response status is `401`; `sessionStorage.token` is non-null; the request URL does NOT include `/api/auth/`. When triggered it SHALL write a message to `sessionStorage.sf_aviso`, remove the token and user from sessionStorage, and call `window.location.assign('/')`. It SHALL always re-reject the error.

#### Scenario: Expired token on product list
- **WHEN** `GET /api/products` returns 401 and the user had a stored token
- **THEN** `sessionStorage.sf_aviso` is set, token and user are removed, and the browser navigates to `/`

#### Scenario: Bad login attempt
- **WHEN** `POST /api/auth/login` returns 401
- **THEN** no automatic logout occurs and the error is returned to the caller

### Requirement: Auth functions
The module SHALL export `login(identifier, senha)`, `register(data)`, `buscarContaRecuperacao(identificador, recaptchaToken)`, `enviarCodigoRecuperacao(busca_token)`, `verificarCodigoRecuperacao(busca_token, codigo)`, and `redefinirSenhaRecuperacao(reset_token, nova_senha)`.

#### Scenario: Login call
- **WHEN** `login('user@example.com', 'pass')` is called
- **THEN** a POST request is made to `/api/auth/login` with the credentials in the body

### Requirement: Profile and notification functions
The module SHALL export `getProfile()`, `updateEmailRecuperacao(data)`, `listNotificacoes()`, `marcarNotificacoesLidas()`, and `dispensarNotificacao(id)`.

#### Scenario: List notifications
- **WHEN** `listNotificacoes()` is called
- **THEN** a GET request is made to `/api/notificacoes`

### Requirement: Product functions
The module SHALL export `listProducts()`, `listArchivedProducts()`, `lookupBarcode(codigo)`, `createProduct(data)`, `deleteProduct(id)`, `withdrawProduct(id, quantidade)`, `entryProduct(id, quantidade)`, `archiveProduct(id)`, and `restoreProduct(id)`.

#### Scenario: Withdraw product
- **WHEN** `withdrawProduct(5, 3)` is called
- **THEN** a POST request is made to `/api/products/5/withdraw` with body `{ quantidade: 3 }`

#### Scenario: List archived products
- **WHEN** `listArchivedProducts()` is called
- **THEN** a GET request is made to `/api/products?arquivados=1`

### Requirement: Movement and report functions
The module SHALL export `listMovements(params)`, `listMovementUsers()`, and `getReport(from, to)`.

#### Scenario: Get report
- **WHEN** `getReport('2025-01-01', '2025-01-31')` is called
- **THEN** a GET request is made to `/api/reports?from=2025-01-01&to=2025-01-31`

### Requirement: User management functions
The module SHALL export `listUsers()`, `createUser(data)`, `updateUserRole(id, role)`, `toggleUserStatus(id)`, and `deleteUser(id)`. The default export SHALL be the Axios instance.

#### Scenario: Update user role
- **WHEN** `updateUserRole(3, 'socio')` is called
- **THEN** a PUT request is made to `/api/users/3/role` with body `{ role: 'socio' }`

#### Scenario: Toggle user status
- **WHEN** `toggleUserStatus(7)` is called
- **THEN** a PUT request is made to `/api/users/7/status`
