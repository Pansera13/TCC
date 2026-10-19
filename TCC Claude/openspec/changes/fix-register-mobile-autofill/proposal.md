# Proposal

## Why

O cadastro de novas contas falha em todos os dispositivos com a mensagem "Preencha todos os campos" mesmo com todos os campos preenchidos. O frontend não exibe o reCAPTCHA quando `VITE_RECAPTCHA_SITE_KEY` não está configurado e permite o envio, mas o backend sempre exige `recaptchaToken` — como o token nunca é gerado sem o widget, o backend rejeita a requisição na validação de campos obrigatórios.

## What Changes

- O backend passará a exigir e verificar `recaptchaToken` apenas quando `RECAPTCHA_SECRET` estiver configurado nas variáveis de ambiente
- O comportamento do frontend permanece inalterado (já trata a ausência da chave corretamente)

## Capabilities

### New Capabilities

_(nenhuma)_

### Modified Capabilities

- `auth/register`: A validação de `recaptchaToken` no cadastro DEVE ser condicional à configuração de `RECAPTCHA_SECRET` no backend

## Impact

- `backend/src/controllers/authController.js`: tornar a checagem e verificação do `recaptchaToken` condicionais
- Sem alterações no frontend, banco de dados ou outras rotas
