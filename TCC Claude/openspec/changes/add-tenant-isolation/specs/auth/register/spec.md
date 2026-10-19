# Spec Delta

## MODIFIED Requirements

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
