# Spec Delta

## ADDED Requirements

### Requirement: Busca da conta para recuperação

O passo 1 DEVE pedir o e-mail de login ou o CPF/CNPJ da conta e oferecer o botão "Buscar conta". O formulário DEVE incluir reCAPTCHA v2 somente quando estiver configurado (`VITE_RECAPTCHA_SITE_KEY` no frontend, `RECAPTCHA_SECRET` no backend); sem configuração, a busca prossegue sem CAPTCHA.

#### Scenario: Conta encontrada

- **WHEN** usuário informa um e-mail de login ou CPF/CNPJ de uma conta principal ativa com e-mail de recuperação e clica em "Buscar conta"
- **THEN** o sistema avança para o passo de confirmação sem enviar nenhum e-mail

#### Scenario: Bloqueio sem reCAPTCHA

- **WHEN** o reCAPTCHA está configurado e o usuário não o completa
- **THEN** o botão "Buscar conta" permanece desabilitado e o backend recusa a busca sem token válido

#### Scenario: Busca sem reCAPTCHA configurado

- **WHEN** `RECAPTCHA_SECRET` não está configurado
- **THEN** a busca é aceita sem exigir token de CAPTCHA

### Requirement: Confirmação da conta com dados mascarados

O passo 2 DEVE mostrar, de forma mascarada, o nome da conta e o e-mail de recuperação (exemplo: "Conta de Mi***. Vamos enviar um código para j***@gmail.com. Essa é a conta correta?") com os botões "Sim, enviar código" e "Não, voltar". O código SHALL ser enviado somente depois de "Sim, enviar código". A máscara DEVE preservar no máximo as duas primeiras letras do nome e a primeira letra da parte local do e-mail, e DEVE esconder o restante com asteriscos de tamanho fixo, sem revelar o tamanho real.

#### Scenario: Confirmar a conta

- **WHEN** usuário clica em "Sim, enviar código" no passo 2
- **THEN** o sistema envia o código ao e-mail de recuperação e avança para o passo de digitar o código

#### Scenario: Conta errada

- **WHEN** usuário clica em "Não, voltar" no passo 2
- **THEN** nenhum e-mail é enviado e o sistema volta ao passo 1

#### Scenario: Dados mascarados na tela

- **WHEN** o passo 2 é exibido
- **THEN** nem a resposta da busca nem a tela contêm o nome completo, o e-mail de recuperação completo ou o e-mail de login da conta

### Requirement: Código de recuperação por e-mail

O sistema DEVE gerar um código de 6 dígitos por solicitação com gerador criptográfico, guardar somente o hash dele e enviá-lo ao e-mail de recuperação. O código DEVE valer 15 minutos e ser de uso único. Pedir um novo código DEVE invalidar o anterior. O código DEVE ser invalidado após 5 tentativas erradas. O reenvio DEVE respeitar intervalo mínimo de 60 segundos. O passo 3 DEVE oferecer um campo para o código e a opção "Reenviar código" com contagem regressiva.

#### Scenario: Código correto

- **WHEN** usuário digita o código válido, dentro do prazo, no passo 3
- **THEN** o sistema aceita o código e libera a definição da nova senha

#### Scenario: Código incorreto ou expirado

- **WHEN** usuário digita um código errado ou expirado
- **THEN** o sistema exibe "Código inválido ou expirado" e informa quantas tentativas restam

#### Scenario: Cinco tentativas erradas

- **WHEN** usuário erra o código pela quinta vez
- **THEN** o código é invalidado e o usuário precisa pedir um novo

#### Scenario: Novo código invalida o anterior

- **WHEN** usuário pede e recebe um segundo código
- **THEN** o primeiro código deixa de funcionar, mesmo dentro dos 15 minutos

#### Scenario: Reenvio antes de 60 segundos

- **WHEN** usuário tenta reenviar o código menos de 60 segundos depois do último envio
- **THEN** o sistema recusa com HTTP 429 e informa em quantos segundos será possível reenviar

#### Scenario: Reuso do código

- **WHEN** um código já usado para redefinir a senha é digitado de novo
- **THEN** o sistema o recusa como inválido

### Requirement: Contas sem recuperação por código

O sistema DEVE responder com mensagem própria a cada caso sem saída, sem enviar e-mail: conta não encontrada; conta principal sem e-mail de recuperação (contas antigas), orientando a procurar o suporte; conta de equipe (Funcionário ou Sócio criado por administrador), orientando a pedir ao administrador a redefinição da senha; e conta desativada.

#### Scenario: Conta não encontrada

- **WHEN** a busca não encontra nenhuma conta para o identificador informado
- **THEN** o sistema exibe "Conta não encontrada" e permanece no passo 1

#### Scenario: Conta antiga sem e-mail de recuperação

- **WHEN** a conta principal encontrada não tem e-mail de recuperação
- **THEN** o sistema informa que a conta não tem e-mail de recuperação cadastrado e não envia nenhum código

#### Scenario: Conta de equipe

- **WHEN** a conta encontrada é de equipe
- **THEN** o sistema orienta a pedir ao administrador a redefinição da senha e não envia nenhum código

#### Scenario: Conta desativada

- **WHEN** a conta encontrada está desativada
- **THEN** o sistema informa que a conta está desativada e orienta a falar com o administrador

### Requirement: Limites e privacidade da recuperação

A busca revela dados mascarados da conta, o que expõe a existência de contas; por isso o sistema DEVE limitar buscas e envios por conta e por IP e responder HTTP 429 quando o limite for excedido. A redefinição pelo administrador para contas de equipe está fora do escopo desta recuperação.

#### Scenario: Excesso de buscas pelo mesmo IP

- **WHEN** um mesmo IP excede o limite de buscas em uma janela de tempo
- **THEN** o sistema responde HTTP 429 com mensagem pedindo para tentar mais tarde

#### Scenario: Excesso de envios para a mesma conta

- **WHEN** são pedidos mais códigos para a mesma conta do que o limite por janela de tempo
- **THEN** o sistema responde HTTP 429 e não envia o e-mail

### Requirement: Envio do código pelo Resend

O sistema DEVE enviar o e-mail do código pela API HTTP do Resend usando `RESEND_API_KEY` e `EMAIL_FROM`. Sem domínio verificado no Resend, o envio só alcança o e-mail da própria conta Resend e o remetente é `onboarding@resend.dev`. Falha no envio DEVE resultar em erro claro ao usuário e NÃO DEVE consumir o limite de reenvio nem deixar um código válido gravado.

#### Scenario: Envio bem-sucedido

- **WHEN** o usuário confirma a conta no passo 2 e o Resend aceita o e-mail
- **THEN** o e-mail com o código de 6 dígitos é entregue ao e-mail de recuperação

#### Scenario: Falha no Resend

- **WHEN** o Resend recusa ou não responde
- **THEN** o sistema informa que não foi possível enviar o e-mail agora, invalida o código gerado e permite tentar de novo imediatamente

#### Scenario: Chave do Resend ausente

- **WHEN** `RESEND_API_KEY` não está configurada
- **THEN** o sistema informa que o envio de e-mail não está disponível e não grava código

## MODIFIED Requirements

### Requirement: Definição da nova senha

O passo final DEVE solicitar nova senha (mínimo 8 caracteres) e confirmação. Após salvar com sucesso, DEVE redirecionar para o login com mensagem de sucesso. O código usado DEVE ser invalidado após uso.

#### Scenario: Troca de senha bem-sucedida

- **WHEN** usuário informa nova senha e confirmação iguais, com pelo menos 8 caracteres, e clica em SALVAR SENHA
- **THEN** senha é atualizada, código é invalidado e usuário é redirecionado para login com mensagem "Senha alterada com sucesso!"

#### Scenario: Senhas divergentes no passo 3

- **WHEN** usuário informa senhas diferentes nos dois campos
- **THEN** sistema exibe erro "As senhas não coincidem" e bloqueia o envio

#### Scenario: Senha curta

- **WHEN** usuário informa nova senha com menos de 8 caracteres
- **THEN** sistema exibe "Mínimo 8 caracteres" e bloqueia o envio

## REMOVED Requirements

### Requirement: Identificação do usuário para recuperação

**Reason**: O fluxo antigo exigia e-mail e CPF/CNPJ e enviava o código ao próprio e-mail de login; a recuperação agora usa o e-mail de recuperação, com busca e confirmação mascarada.
**Migration**: Use os requisitos "Busca da conta para recuperação" e "Confirmação da conta com dados mascarados".

### Requirement: Validação do código por e-mail

**Reason**: O código agora vai ao e-mail de recuperação, tem limite de tentativas e reenvio controlado, e segue regras de segurança novas.
**Migration**: Use o requisito "Código de recuperação por e-mail".
