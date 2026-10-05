# Spec: auth/forgot-password

## Purpose

Permite que usuários que esqueceram a senha recuperem o acesso verificando identidade por e-mail e CPF/CNPJ, com código temporário enviado por e-mail e proteção anti-robô.

## Requirements

### Requirement: Identificação do usuário para recuperação

O passo 1 DEVE solicitar e-mail cadastrado e CPF ou CNPJ. Ambos DEVEM corresponder ao mesmo cadastro para prosseguir. O formulário DEVE incluir reCAPTCHA v2. O botão AVANÇAR DEVE enviar um código de 6 dígitos para o e-mail informado.

#### Scenario: Identificação válida com reCAPTCHA

- **WHEN** usuário informa e-mail e CPF/CNPJ corretos e completa o reCAPTCHA e clica em AVANÇAR
- **THEN** sistema envia e-mail com código de 6 dígitos e avança para o passo 2

#### Scenario: Dados não encontrados

- **WHEN** usuário informa combinação de e-mail e CPF/CNPJ que não corresponde a nenhum cadastro
- **THEN** sistema exibe mensagem genérica "Dados não encontrados" sem revelar quais campos estão errados

#### Scenario: Bloqueio sem reCAPTCHA no passo 1

- **WHEN** usuário preenche e-mail e CPF/CNPJ mas não completa o reCAPTCHA
- **THEN** botão AVANÇAR permanece desabilitado

### Requirement: Validação do código por e-mail

O passo 2 DEVE exibir o e-mail mascarado (ex: `l***@gmail.com`), 6 caixas individuais de dígito com foco automático entre elas, contador regressivo de 59 segundos para reenvio, e botão CONFIRMAR.

#### Scenario: Foco automático entre caixas

- **WHEN** usuário digita um dígito em qualquer caixa exceto a última
- **THEN** o foco move automaticamente para a próxima caixa

#### Scenario: Código correto

- **WHEN** usuário informa os 6 dígitos corretos e clica em CONFIRMAR
- **THEN** sistema valida o código e avança para o passo 3

#### Scenario: Código expirado ou incorreto

- **WHEN** usuário informa código inválido ou expirado
- **THEN** sistema exibe erro "Código inválido ou expirado"

#### Scenario: Reenvio de código

- **WHEN** contador regressivo chega a zero e usuário clica em "Reenviar código"
- **THEN** novo código é gerado e enviado para o e-mail e o contador é reiniciado para 59 segundos

### Requirement: Definição da nova senha

O passo 3 DEVE solicitar nova senha e confirmação. Após salvar com sucesso, DEVE redirecionar para o login com mensagem de sucesso. O código usado DEVE ser invalidado após uso.

#### Scenario: Troca de senha bem-sucedida

- **WHEN** usuário informa nova senha e confirmação iguais e clica em SALVAR SENHA
- **THEN** senha é atualizada, código é invalidado e usuário é redirecionado para login com mensagem "Senha alterada com sucesso!"

#### Scenario: Senhas divergentes no passo 3

- **WHEN** usuário informa senhas diferentes nos dois campos do passo 3
- **THEN** sistema exibe erro "As senhas não coincidem" e bloqueia o envio
