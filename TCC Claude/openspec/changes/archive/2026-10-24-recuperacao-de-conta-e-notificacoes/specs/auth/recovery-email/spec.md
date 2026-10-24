# Spec Delta

## Purpose

Permite que o dono da conta cadastre e troque, pelo menu do perfil, o e-mail de recuperação usado para redefinir a senha, com as mesmas regras do cadastro e confirmação da senha atual.

## ADDED Requirements

### Requirement: Cadastro e edição do e-mail de recuperação no perfil

O menu do perfil SHALL oferecer a opção "E-mail de recuperação" ao dono da conta (conta principal), a qualquer momento, inclusive depois de a notificação ter sido dispensada. A opção abre um formulário com o e-mail atual (se houver), o novo e-mail digitado duas vezes e a senha atual. As contas de equipe (Funcionário ou Sócio criados por administrador) SHALL NOT ver a opção e o backend SHALL recusar a alteração delas com HTTP 403.

#### Scenario: Dono da conta abre o formulário

- **WHEN** o dono da conta clica em "E-mail de recuperação" no menu do perfil
- **THEN** o sistema exibe o formulário com o e-mail atual (ou vazio) e os campos de novo e-mail, confirmação e senha atual

#### Scenario: Conta de equipe

- **WHEN** um Funcionário ou Sócio criado por administrador abre o menu do perfil
- **THEN** a opção "E-mail de recuperação" não aparece e uma chamada direta ao backend responde HTTP 403

#### Scenario: Disponível depois de dispensar a notificação

- **WHEN** o dono da conta dispensou a notificação "Cadastre seu e-mail de recuperação" e ainda não cadastrou o e-mail
- **THEN** a opção no menu do perfil continua disponível

### Requirement: Validação e senha atual ao trocar o e-mail

Ao salvar, o sistema SHALL exigir a senha atual correta e aplicar as regras do cadastro: formato válido, diferente do e-mail de login (sem espaços e sem diferenciar maiúsculas), provedor da lista permitida e digitado duas vezes. O mesmo e-mail PODE ser usado por outras contas. A senha atual errada SHALL impedir a alteração.

#### Scenario: Troca bem-sucedida

- **WHEN** o dono informa novo e-mail válido, a confirmação igual e a senha atual correta
- **THEN** o e-mail de recuperação é atualizado, o sistema confirma a alteração e a notificação de cadastro, se existir, é resolvida

#### Scenario: Senha atual incorreta

- **WHEN** o dono informa a senha atual errada
- **THEN** o sistema recusa com a mensagem "Senha atual incorreta" e não altera o e-mail

#### Scenario: E-mail inválido

- **WHEN** o novo e-mail é igual ao de login, de provedor não permitido ou diferente da confirmação
- **THEN** o sistema exibe o erro correspondente (e a sugestão "Você quis dizer …?" quando couber) e não altera o e-mail

#### Scenario: Tentativas repetidas de senha

- **WHEN** há muitas tentativas seguidas com senha atual errada
- **THEN** o sistema responde HTTP 429 e bloqueia novas tentativas por um tempo
