# Spec: frontend/login-page

## Purpose
Provide the entry point for authenticated access to StockFlow, accepting an identifier and password, then establishing a session and navigating to the dashboard.

## Requirements

### Requirement: Page layout
The page SHALL render a full-viewport div with a diagonal purple gradient background (`from-white via-white to-[#E879F9]/30` in light mode; `from-black via-[#2e1065] to-[#7C3AED]` in dark mode). The top third contains the logo and product name; the bottom two-thirds contain the login card. The logo (`/logo.png`, 96 × 96 px) uses `mix-blend-multiply` in light mode and `mix-blend-screen` in dark mode.

#### Scenario: Light mode layout
- **WHEN** `darkMode` is false
- **THEN** the background gradient ends with `#E879F9/30` and the logo uses `mix-blend-multiply`

#### Scenario: Dark mode layout
- **WHEN** `darkMode` is true
- **THEN** the background gradient ends with `#7C3AED` and the logo uses `mix-blend-screen`

### Requirement: Dark-mode toggle
A circular toggle button SHALL be positioned at `top: 1rem; right: 1rem` and SHALL call `setDarkMode(!darkMode)` on click.

#### Scenario: Toggle dark mode
- **WHEN** the user clicks the toggle button while in light mode
- **THEN** `setDarkMode(true)` is called

### Requirement: Identifier field
The identifier input SHALL accept email addresses, company names, CPF (`000.000.000-00`), and CNPJ (`00.000.000/0001-00`). When the value starts with digits and contains no `@`, CPF/CNPJ numeric formatting SHALL be applied automatically. The label SHALL read "Empresa / CNPJ / CPF / E-mail".

#### Scenario: CPF auto-format
- **WHEN** the user types `12345678901`
- **THEN** the field displays `123.456.789-01`

#### Scenario: Email input is not formatted
- **WHEN** the user types `user@example.com`
- **THEN** the value is stored as-is without numeric formatting

### Requirement: Password field
The password field SHALL default to type `password`. A toggle button (eye icon, `tabIndex={-1}`) SHALL switch between `password` and `text`.

#### Scenario: Password visibility toggle
- **WHEN** the user clicks the eye icon while the field is masked
- **THEN** the input type changes to `text` and the password is visible

### Requirement: Navigation links
"Esqueci minha senha" SHALL link to `/forgot-password`. "Cadastrar-se" SHALL link to `/register`.

#### Scenario: Forgot password link
- **WHEN** the user clicks "Esqueci minha senha"
- **THEN** the browser navigates to `/forgot-password`

### Requirement: Success and error feedback
When the URL contains `?success=cadastro` a green "Conta criada com sucesso! Faça seu login." message SHALL be shown. When `?success=senha` a green "Senha alterada com sucesso! Faça seu login." message SHALL be shown. On load, `sessionStorage.sf_aviso` SHALL be read, shown as an error, and then removed. API errors are shown as red inline messages. Empty-field validation error is "Preencha todos os campos."

#### Scenario: Success message after registration
- **WHEN** the page loads with `?success=cadastro` in the URL
- **THEN** a green success message appears

#### Scenario: Session warning after account disabled
- **WHEN** `sessionStorage.sf_aviso` contains "Conta desativada." on page load
- **THEN** that message is displayed as an error and the key is removed from sessionStorage

### Requirement: Submit behaviour
The "ENTRAR" button SHALL be disabled while the request is in-flight (label: "Entrando…"). On success the component SHALL call `loginUser(...)` and navigate to `/dashboard`.

#### Scenario: Correct credentials
- **WHEN** the user submits valid credentials
- **THEN** the session is stored and the browser navigates to `/dashboard`

#### Scenario: Wrong password
- **WHEN** the API returns a 4xx error
- **THEN** an inline error message is displayed and the form remains on screen

### Requirement: Card appearance
The login card SHALL be `bg-white` (light) / `bg-gray-900` (dark), `border-radius: 2rem`, paddings of `2.5 cm` vertical and `2.27 cm` horizontal, with a subtle box-shadow. The form inside SHALL be `332 px` wide.

#### Scenario: Card renders in dark mode
- **WHEN** `darkMode` is true
- **THEN** the card background is `bg-gray-900`
