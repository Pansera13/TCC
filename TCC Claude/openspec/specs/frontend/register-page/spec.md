# Spec: frontend/register-page

## Purpose
Allow a new business owner to create a StockFlow account, collecting personal, company, and security information before redirecting to the login page with a success message.

## Requirements

### Requirement: Page layout
The page SHALL share the same full-viewport gradient background and dark-mode toggle as the Login page. It SHALL display the StockFlow logo (64 × 64 px) and heading "StockFlow — Criar conta" above a white/dark card (`max-w-md`, `rounded-2xl`, `shadow-2xl`).

#### Scenario: Page renders with gradient background
- **WHEN** the Register page loads
- **THEN** the same purple gradient background as the Login page is displayed

### Requirement: Form fields
The form SHALL collect: `nome` (full name), `nome_empresa` (company name), `cpf_cnpj` (CPF or CNPJ, auto-formatted), `email` (`type="email"`), `email_recuperacao` (recovery email, `type="email"`), `email_recuperacao_confirmacao` (paste blocked), `senha` (min 8 chars, show/hide, `autoComplete="new-password"`), `confirmar` (paste blocked, show/hide, `autoComplete="new-password"`). Senha and Confirmar appear side-by-side in a 2-column grid.

#### Scenario: CPF/CNPJ auto-formatting
- **WHEN** the user types `12345678901` in the CPF/CNPJ field
- **THEN** the field displays `123.456.789-01`

#### Scenario: Paste blocked on confirmation fields
- **WHEN** the user attempts to paste into `email_recuperacao_confirmacao` or `confirmar`
- **THEN** the paste event is prevented

### Requirement: Email recovery typo detection
When typing in `email_recuperacao`, the `problemaEmailRecuperacao` utility SHALL be invoked to detect likely domain typos. If a problem is detected the field error and a suggested correction SHALL be displayed. Clicking "Corrigir" SHALL replace the field value with the corrected domain via `aplicarSugestao`.

#### Scenario: Typo in recovery email
- **WHEN** the user types `user@gmali.com` in the recovery email field
- **THEN** a suggestion is shown with a "Corrigir" button

#### Scenario: User applies suggestion
- **WHEN** the user clicks "Corrigir" next to the suggestion
- **THEN** the recovery email field value is updated to the corrected address

### Requirement: Client-side validation
Before submitting the component SHALL validate: all required fields non-empty; `email` matches email regex; `email_recuperacao` passes typo detection; recovery email fields normalise to the same value; `senha` >= 8 characters; `senha` equals `confirmar`. Per-field inline errors appear below each input.

#### Scenario: Passwords do not match
- **WHEN** `senha = 'abc12345'` and `confirmar = 'abc12346'`
- **THEN** "As senhas não coincidem." appears under the confirm field and the form is not submitted

#### Scenario: Short password
- **WHEN** `senha` has fewer than 8 characters
- **THEN** "Mínimo 8 caracteres." appears under the senha field

### Requirement: reCAPTCHA
If `VITE_RECAPTCHA_SITE_KEY` is set a `react-google-recaptcha` widget SHALL render and the submit button SHALL be disabled until the token is non-empty. The widget theme SHALL match `darkMode`.

#### Scenario: reCAPTCHA required but not completed
- **WHEN** `VITE_RECAPTCHA_SITE_KEY` is set and the CAPTCHA is unsolved
- **THEN** the submit button is disabled

#### Scenario: reCAPTCHA not configured
- **WHEN** `VITE_RECAPTCHA_SITE_KEY` is absent
- **THEN** no CAPTCHA widget renders and the form submits without a token

### Requirement: Submit behaviour
On valid submit the component SHALL POST to `/api/auth/register`. On success it SHALL navigate to `/?success=cadastro`. On API error with a `field` property the error appears on that field; otherwise it appears in `apiError`. The reCAPTCHA is reset on error.

#### Scenario: Successful registration
- **WHEN** all fields are valid and the API responds with 2xx
- **THEN** the browser navigates to `/?success=cadastro`

#### Scenario: Duplicate email from API
- **WHEN** the API returns `{ field: 'email', message: 'E-mail já cadastrado.' }`
- **THEN** the error appears under the email field and the form stays open

### Requirement: Link back to login
A link reading "← Já tenho conta" SHALL navigate to `/`.

#### Scenario: Back to login
- **WHEN** the user clicks "← Já tenho conta"
- **THEN** the browser navigates to `/`
