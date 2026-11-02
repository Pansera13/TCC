# Spec: frontend/forgot-password-page

## Purpose
Guide the user through a 4-step password recovery flow: account lookup, confirmation, 6-digit code entry, and new password creation.

## Requirements

### Requirement: Page shell
The page SHALL use the same full-viewport gradient background and dark-mode toggle as the Login page. Steps are rendered as swappable card components centred in the page. The StockFlow logo (64 × 64 px) and "StockFlow" heading are shown above the active card.

#### Scenario: Page displays logo and heading
- **WHEN** the ForgotPassword page loads
- **THEN** the StockFlow logo and heading are visible above the step card

### Requirement: Step 1 — Account lookup
The user SHALL provide their login email or CPF/CNPJ. CPF/CNPJ auto-formatting SHALL be applied. If `VITE_RECAPTCHA_SITE_KEY` is set a reCAPTCHA SHALL be required. On success the API returns `busca_token`, `nome_mascarado`, `email_mascarado`; the flow advances to step 2.

#### Scenario: Account not found
- **WHEN** the API returns an error for the lookup
- **THEN** an inline error is displayed and the reCAPTCHA is reset

#### Scenario: Successful account lookup
- **WHEN** the user provides a valid email and the API succeeds
- **THEN** the flow advances to step 2 with masked account data

### Requirement: Step 2 — Confirmation
The component SHALL display `busca.nome_mascarado` and `busca.email_mascarado`. "Sim, enviar código" SHALL POST to `/api/auth/recuperacao/enviar-codigo`. On success the flow advances to step 3 with `reenvio_em` seconds. "Não, voltar" SHALL return to step 1.

#### Scenario: Correct account confirmed
- **WHEN** the user clicks "Sim, enviar código"
- **THEN** a code is sent to the masked email and the flow advances to step 3

#### Scenario: Wrong account selected
- **WHEN** the user clicks "Não, voltar"
- **THEN** the flow returns to step 1 and `busca` is cleared

### Requirement: Step 3 — Code entry
The component SHALL render 6 individual numeric digit inputs. Digit entry SHALL auto-advance focus; Backspace on an empty input SHALL move focus back. Pasting the full code into any input SHALL distribute across all 6 inputs. A countdown from `esperaInicial` seconds is shown; once it reaches 0 a "Reenviar código" button appears.

#### Scenario: Auto-advance on digit entry
- **WHEN** the user types a digit in input 3
- **THEN** focus moves to input 4

#### Scenario: Paste full code
- **WHEN** the user pastes "123456" into the first input
- **THEN** all 6 inputs are populated

#### Scenario: Resend after countdown
- **WHEN** the countdown reaches 0 and the user clicks "Reenviar código"
- **THEN** a new code is sent and the countdown resets

### Requirement: Step 3 — Code verification
On form submit the code is verified via `POST /api/auth/recuperacao/verificar-codigo`. On success `reset_token` is received and the flow advances to step 4. On error the inputs are cleared, focus returns to input 1, and the error message is shown with remaining attempts if provided.

#### Scenario: Wrong code with attempts remaining
- **WHEN** the user enters an incorrect code and `tentativas_restantes: 2` is returned
- **THEN** the error reads "… Restam 2 tentativas." and all inputs are cleared

#### Scenario: Correct code
- **WHEN** the user enters the correct 6-digit code
- **THEN** the flow advances to step 4

### Requirement: Step 4 — New password
The component SHALL accept `nova_senha` (show/hide toggle) and `confirmar`. Minimum 8 characters; both fields must match. On success navigate to `/?success=senha`. If the API returns 400 without a `field` the token expired; show the error and after 2.5 s call `onExpirou()` to restart at step 1.

#### Scenario: Successful password reset
- **WHEN** the new password passes validation and the API succeeds
- **THEN** the user is redirected to `/?success=senha`

#### Scenario: Expired reset token
- **WHEN** the API returns 400 without a `field`
- **THEN** the error is displayed for 2.5 s and then the flow restarts at step 1

#### Scenario: Password too short
- **WHEN** the user enters a password with fewer than 8 characters
- **THEN** "Mínimo 8 caracteres." is shown and the form is not submitted
