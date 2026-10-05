# Spec: auth/register

## Purpose

Permite que novos usuários criem uma conta no StockFlow fornecendo dados pessoais e da empresa, com validação de CPF/CNPJ e proteção anti-robô via reCAPTCHA.

## Requirements

### Requirement: Campos do formulário de cadastro

O formulário DEVE conter os campos: nome completo (obrigatório), nome da empresa (obrigatório), CPF ou CNPJ (obrigatório, formatação automática, mesmo comportamento do campo de login), e-mail (obrigatório, validação de formato), senha (obrigatório, mínimo 8 caracteres), confirmar senha (obrigatório, DEVE ser igual à senha).

#### Scenario: Validação de senhas divergentes

- **WHEN** usuário preenche "confirmar senha" com valor diferente de "senha" e tenta cadastrar
- **THEN** sistema exibe erro "As senhas não coincidem" e bloqueia o envio

#### Scenario: Formatação automática de CPF

- **WHEN** usuário digita 11 dígitos no campo CPF/CNPJ
- **THEN** sistema formata automaticamente como `000.000.000-00`

#### Scenario: Formatação automática de CNPJ

- **WHEN** usuário digita 14 dígitos no campo CPF/CNPJ
- **THEN** sistema formata automaticamente como `00.000.000/0001-00`

### Requirement: Proteção anti-robô no cadastro

O formulário DEVE incluir reCAPTCHA v2 ("Não sou robô") antes do botão CADASTRAR. O botão DEVE permanecer desabilitado até que o reCAPTCHA seja validado.

#### Scenario: Bloqueio sem reCAPTCHA

- **WHEN** usuário preenche todos os campos mas não completa o reCAPTCHA
- **THEN** botão CADASTRAR permanece desabilitado e o envio é impedido

#### Scenario: Habilitação após reCAPTCHA

- **WHEN** usuário completa o desafio reCAPTCHA com sucesso
- **THEN** botão CADASTRAR é habilitado

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
