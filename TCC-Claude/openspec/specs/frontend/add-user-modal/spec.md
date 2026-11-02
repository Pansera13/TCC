# Spec: frontend/add-user-modal

## Purpose
Allow an authorised user to create a new team member account, with the assignable roles limited by the caller's own permissions.

## Requirements

### Requirement: Fields
The form SHALL collect: `nome` (required, auto-focused), `email` (required, `type="email"`), `cpf_cnpj` (required, placeholder "000.000.000-00"), `senha` (required, min 6 chars, show/hide toggle), and `role` (required select). Default `role` is `'user'`.

#### Scenario: Auto-focus on nome
- **WHEN** the modal opens
- **THEN** the nome input receives focus automatically

### Requirement: Available roles
The `cargos` prop determines which roles appear in the select. Options SHALL be rendered in reverse order (highest role first). Role display names come from `ROLES`: `admin → 'Administrador'`, `socio → 'Sócio'`, `user → 'Funcionário'`.

#### Scenario: Sócio creating a user
- **WHEN** the logged-in user does not have `usuario:criar-privilegiado`
- **THEN** only "Funcionário" appears in the role dropdown

#### Scenario: Admin creating a user
- **WHEN** the logged-in user has `usuario:criar-privilegiado`
- **THEN** "Administrador", "Sócio", and "Funcionário" appear in the role dropdown

### Requirement: Client-side validation
On submit the component SHALL validate: `nome` non-empty, `email` non-empty and valid format, `cpf_cnpj` non-empty, `senha` non-empty and ≥ 6 characters. Per-field inline errors appear below each field; `_global` error at the top for API errors.

#### Scenario: Short password
- **WHEN** the user enters a 4-character password
- **THEN** "Mínimo 6 caracteres." appears and the form is not submitted

#### Scenario: Invalid email format
- **WHEN** the user enters `notanemail`
- **THEN** "E-mail inválido." appears

### Requirement: Password show/hide toggle
The password field SHALL have a text toggle button showing "Mostrar"/"Ocultar".

#### Scenario: Show password
- **WHEN** the user clicks "Mostrar"
- **THEN** the password input type changes to `text`

### Requirement: API call
On valid submit the component SHALL call `POST /api/users`. On success `onUserAdded()` then `onClose()`. On error the `_global` error is shown.

#### Scenario: Successful user creation
- **WHEN** all fields are valid and the API responds with 2xx
- **THEN** `onUserAdded()` is called to refresh the team list and the modal closes

#### Scenario: Duplicate email
- **WHEN** the API returns a duplicate email error
- **THEN** the `_global` error box shows the message and the form stays open

### Requirement: Dismiss behaviour
Pressing `Escape`, clicking the overlay, or clicking `✕` SHALL call `onClose()`.

#### Scenario: Escape key closes modal
- **WHEN** the user presses Escape
- **THEN** `onClose()` is called
