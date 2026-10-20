# Spec: auth/register

## Purpose

Permite que novos usuários criem uma conta no StockFlow fornecendo dados pessoais e da empresa, com validação de CPF/CNPJ e proteção anti-robô via reCAPTCHA.

## Requirements

### Requirement: Campos do formulário de cadastro

O formulário DEVE conter os campos: nome completo (obrigatório), nome da empresa (obrigatório), CPF ou CNPJ (obrigatório, formatação automática, mesmo comportamento do campo de login), e-mail (obrigatório, validação de formato), senha (obrigatório, mínimo 8 caracteres), confirmar senha (obrigatório, DEVE ser igual à senha). A validação no envio DEVE capturar os valores atuais dos campos mesmo que tenham sido preenchidos via autopreenchimento (autofill) do browser sem disparar `onChange`. O cadastro público DEVE criar um tenant isolado: o novo usuário recebe `tenant_id` igual ao seu próprio `id`, tornando-o dono de uma empresa independente sem acesso aos dados de outras contas.

#### Scenario: Validação de senhas divergentes

- **WHEN** usuário preenche "confirmar senha" com valor diferente de "senha" e tenta cadastrar
- **THEN** sistema exibe erro "As senhas não coincidem" e bloqueia o envio

#### Scenario: Formatação automática de CPF

- **WHEN** usuário digita 11 dígitos no campo CPF/CNPJ
- **THEN** sistema formata automaticamente como `000.000.000-00`

#### Scenario: Formatação automática de CNPJ

- **WHEN** usuário digita 14 dígitos no campo CPF/CNPJ
- **THEN** sistema formata automaticamente como `00.000.000/0001-00`

#### Scenario: Cadastro cria tenant isolado

- **WHEN** usuário completa o cadastro público com sucesso
- **THEN** a conta criada não compartilha produtos, movimentações nem equipe com nenhuma outra conta do sistema

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

### Requirement: Resultado do cadastro

Após cadastro bem-sucedido, o sistema DEVE redirecionar para a tela de login com mensagem de confirmação. E-mail já cadastrado DEVE retornar erro informando que o e-mail já está em uso.

#### Scenario: Cadastro bem-sucedido

- **WHEN** usuário preenche todos os campos válidos, completa o reCAPTCHA e clica em CADASTRAR
- **THEN** conta é criada e usuário é redirecionado para login com mensagem "Conta criada com sucesso!"

#### Scenario: E-mail duplicado

- **WHEN** usuário tenta cadastrar com e-mail já existente no sistema
- **THEN** sistema exibe erro "Este e-mail já está cadastrado"

#### Scenario: CPF/CNPJ duplicado

- **WHEN** usuário tenta cadastrar com CPF ou CNPJ já existente no sistema
- **THEN** sistema exibe erro "Este CPF/CNPJ já está cadastrado"
