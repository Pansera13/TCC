# Spec Delta

## MODIFIED Requirements

### Requirement: Proteção anti-robô no cadastro

O formulário DEVE incluir reCAPTCHA v2 ("Não sou robô") antes do botão CADASTRAR quando `VITE_RECAPTCHA_SITE_KEY` estiver configurado. O botão DEVE permanecer desabilitado até que o reCAPTCHA seja validado. O backend DEVE verificar o token reCAPTCHA apenas quando `RECAPTCHA_SECRET` estiver configurado; sem essa variável, o cadastro DEVE prosseguir sem validação de CAPTCHA.

#### Scenario: Bloqueio sem reCAPTCHA

- **WHEN** usuário preenche todos os campos mas não completa o reCAPTCHA (e reCAPTCHA está configurado)
- **THEN** botão CADASTRAR permanece desabilitado e o envio é impedido

#### Scenario: Habilitação após reCAPTCHA

- **WHEN** usuário completa o desafio reCAPTCHA com sucesso
- **THEN** botão CADASTRAR é habilitado

#### Scenario: Cadastro sem reCAPTCHA configurado

- **WHEN** `RECAPTCHA_SECRET` não está configurado no backend e usuário preenche todos os campos e clica em CADASTRAR
- **THEN** sistema aceita o cadastro sem exigir token de CAPTCHA
