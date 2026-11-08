# Spec Delta

## Purpose

Garante que a foto de perfil do usuário persista entre ciclos de logout/login, fechamento e reabertura do sistema, armazenando-a no localStorage indexada pelo ID do usuário.

## ADDED Requirements

### Requirement: Persistência da foto de perfil por usuário

O sistema DEVE armazenar o `avatarUrl` do usuário no localStorage sob a chave `avatar_<userId>`, separadamente do objeto de sessão. Ao fazer login, o sistema MUST restaurar automaticamente o `avatarUrl` armazenado para o ID do usuário correspondente, mesmo que a sessão anterior tenha sido encerrada (logout, fechamento do navegador, reinicialização do sistema).

#### Scenario: Foto restaurada após logout e re-login

- **WHEN** o usuário define uma foto de perfil, faz logout e faz login novamente com a mesma conta
- **THEN** a foto de perfil é exibida automaticamente, sem necessidade de reenvio

#### Scenario: Foto restaurada após fechar o navegador

- **WHEN** o usuário define uma foto de perfil e fecha e reabre o navegador, fazendo login novamente
- **THEN** a foto de perfil é exibida automaticamente

#### Scenario: Foto não vaza entre contas diferentes

- **WHEN** usuário A define uma foto, faz logout, e usuário B faz login no mesmo navegador
- **THEN** o sistema exibe o avatar de B (ou a inicial do nome, se B não tem foto), não o avatar de A

### Requirement: Remoção do avatar ao excluir conta ou limpar dados

O sistema DEVE remover a entrada `avatar_<userId>` do localStorage apenas quando explicitamente solicitado (funcionalidade futura de exclusão de conta). O logout normal NÃO DEVE remover o avatar armazenado.

#### Scenario: Logout não apaga a foto

- **WHEN** o usuário faz logout
- **THEN** a entrada `avatar_<userId>` permanece no localStorage para ser restaurada no próximo login desse usuário
