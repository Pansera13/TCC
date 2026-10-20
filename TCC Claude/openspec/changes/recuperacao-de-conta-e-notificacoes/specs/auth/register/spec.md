# Spec Delta

## MODIFIED Requirements

### Requirement: Campos do formulário de cadastro

O formulário DEVE conter os campos: nome completo (obrigatório), nome da empresa (obrigatório), CPF ou CNPJ (obrigatório, formatação automática, mesmo comportamento do campo de login), e-mail (obrigatório, validação de formato), e-mail de recuperação e sua confirmação (obrigatórios, regras no requisito "E-mail de recuperação no cadastro"), senha (obrigatório, mínimo 8 caracteres), confirmar senha (obrigatório, DEVE ser igual à senha). Os campos senha e confirmar senha DEVEM usar `autoComplete="new-password"` para o navegador não oferecer senhas salvas de contas antigas. A validação no envio DEVE capturar os valores atuais dos campos mesmo que tenham sido preenchidos via autopreenchimento (autofill) do browser sem disparar `onChange`. O cadastro público DEVE criar um tenant isolado: o novo usuário recebe `tenant_id` igual ao seu próprio `id`, tornando-o dono de uma empresa independente sem acesso aos dados de outras contas.

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

#### Scenario: Navegador não oferece senhas antigas

- **WHEN** usuário foca os campos de senha do cadastro em um navegador com senhas salvas
- **THEN** os dois campos declaram `autoComplete="new-password"` e o navegador não preenche com a senha de uma conta antiga

## ADDED Requirements

### Requirement: E-mail de recuperação no cadastro

O cadastro DEVE exigir um e-mail de recuperação digitado duas vezes (campo e confirmação). O valor DEVE ter formato válido, DEVE ser diferente do e-mail de login da mesma conta (comparação sem espaços e sem diferenciar maiúsculas) e DEVE pertencer a um provedor da lista permitida: gmail.com, hotmail.com, hotmail.com.br, outlook.com, outlook.com.br, live.com, yahoo.com, yahoo.com.br, icloud.com, uol.com.br, bol.com.br, terra.com.br e proton.me. O mesmo e-mail de recuperação PODE se repetir entre contas diferentes. O backend DEVE aplicar as mesmas regras, independentemente da validação da tela. O cadastro NÃO envia código de confirmação para esse e-mail.

#### Scenario: E-mail de recuperação válido

- **WHEN** usuário informa um e-mail de recuperação de provedor permitido, diferente do e-mail de login, igual nos dois campos
- **THEN** o cadastro prossegue e a conta é criada com o e-mail de recuperação gravado em minúsculas e sem espaços

#### Scenario: Igual ao e-mail de login

- **WHEN** usuário informa como recuperação o mesmo endereço do login, mesmo que com maiúsculas ou espaços diferentes
- **THEN** sistema exibe erro informando que o e-mail de recuperação deve ser diferente do e-mail de login e bloqueia o envio

#### Scenario: Provedor fora da lista

- **WHEN** usuário informa um e-mail de recuperação de domínio que não está na lista permitida
- **THEN** sistema exibe mensagem clara de que o provedor não é aceito, lista os provedores aceitos e bloqueia o envio

#### Scenario: Sugestão para erro de digitação

- **WHEN** usuário informa um domínio próximo de um provedor permitido (por exemplo `gmial.com`)
- **THEN** sistema exibe "Você quis dizer gmail.com?" e permite corrigir com um clique, sem aceitar o domínio digitado

#### Scenario: Confirmação divergente

- **WHEN** o campo de confirmação do e-mail de recuperação difere do campo principal
- **THEN** sistema exibe erro "Os e-mails de recuperação não coincidem" e bloqueia o envio

#### Scenario: Mesmo e-mail de recuperação em contas diferentes

- **WHEN** um novo usuário informa um e-mail de recuperação já usado por outra conta
- **THEN** o cadastro é aceito normalmente

#### Scenario: Backend recusa dados inválidos

- **WHEN** uma requisição de cadastro chega ao backend sem e-mail de recuperação, ou com um valor que viola qualquer regra acima
- **THEN** o backend responde HTTP 400 indicando o campo `email_recuperacao` e não cria a conta
