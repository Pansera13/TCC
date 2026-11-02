# Tasks

## 1. Tornar validação de reCAPTCHA condicional no backend

- [x] 1.1 Em `backend/src/controllers/authController.js`, adicionar `const recaptchaEnabled = !!process.env.RECAPTCHA_SECRET;` no início da função `register` e alterar a checagem de campos obrigatórios para incluir `recaptchaToken` apenas quando `recaptchaEnabled` — verificar que a condição fica `if (!nome || !nome_empresa || !cpf_cnpj || !email || !senha || (recaptchaEnabled && !recaptchaToken))`
- [x] 1.2 Envolver a chamada a `verifyRecaptcha` em `if (recaptchaEnabled)` para que a verificação só ocorra quando `RECAPTCHA_SECRET` está definido — verificar que sem a variável o bloco é pulado

## 2. Verificação end-to-end

- [x] 2.1 Com `RECAPTCHA_SECRET` ausente no backend, preencher todos os campos do formulário de cadastro e clicar em CADASTRAR — verificar que a conta é criada sem erros de "Preencha todos os campos"
- [x] 2.2 Com `RECAPTCHA_SECRET` configurado, tentar cadastrar sem completar o reCAPTCHA — verificar que o botão permanece desabilitado (frontend bloqueia) e que se a requisição chegar ao backend diretamente, ela retorna erro de CAPTCHA

## Workflow follow-up

- Arquivar a mudança após revisão.
