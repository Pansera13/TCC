# Design

## Context

O frontend em `Register.jsx` já verifica `hasSiteKey = !!import.meta.env.VITE_RECAPTCHA_SITE_KEY`: se a chave não está configurada, o widget não aparece, `recaptchaToken` fica como `''` e o botão não é bloqueado — o envio acontece com `recaptchaToken: ''`.

O backend em `authController.js` (linha 44) valida incondicionalmente `!recaptchaToken`, o que rejeita qualquer cadastro sem token mesmo quando o CAPTCHA não está configurado. O erro retornado é `'Preencha todos os campos.'`, enganoso para o usuário.

## Goals / Non-Goals

**Goals:**
- Backend aceitar cadastro sem token quando `RECAPTCHA_SECRET` não está definido
- Manter verificação completa do CAPTCHA quando `RECAPTCHA_SECRET` está configurado

**Non-Goals:**
- Alterar comportamento do frontend
- Adicionar novo mecanismo de proteção anti-robô
- Modificar outras rotas (login, forgot-password)

## Decisions

### Condicionar checagem ao env `RECAPTCHA_SECRET`

Em `authController.js`, verificar `const recaptchaEnabled = !!process.env.RECAPTCHA_SECRET` antes da validação de campos. Incluir `recaptchaToken` como obrigatório apenas se `recaptchaEnabled`. Executar `verifyRecaptcha` apenas se `recaptchaEnabled`.

**Alternativa considerada — configurar `RECAPTCHA_SECRET` no backend**: Resolveria o problema, mas o sistema deve funcionar em ambientes de desenvolvimento/teste sem reCAPTCHA configurado.

**Alternativa considerada — alterar o frontend para não enviar o campo**: Seria uma mudança desnecessária; o backend deve ser resiliente à ausência do token quando não está configurado para exigi-lo.

## Risks / Trade-offs

- **[Risco] Ambiente sem CAPTCHA exposto na produção**: Se `RECAPTCHA_SECRET` for esquecido em produção, o endpoint fica desprotegido. Mitigação: documentar que `RECAPTCHA_SECRET` é obrigatório em produção.
