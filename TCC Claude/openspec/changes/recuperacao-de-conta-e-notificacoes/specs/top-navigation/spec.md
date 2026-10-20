# Spec Delta

## ADDED Requirements

### Requirement: Sino de notificações ao lado do perfil

A barra de navegação superior SHALL exibir, ao lado do perfil, um ícone de sino em todas as contas, mesmo sem notificações. O sino SHALL mostrar um contador com o número de notificações não lidas quando houver. Clicar no sino SHALL abrir um menu suspenso com a lista de notificações, que fecha ao clicar fora. O sino e o menu SHALL funcionar em tema claro e escuro e não SHALL aumentar a altura máxima da barra.

#### Scenario: Sino sempre presente

- **WHEN** qualquer usuário abre o Dashboard, tenha ou não notificações
- **THEN** o sino aparece na barra superior ao lado do menu do perfil

#### Scenario: Contador de não lidas

- **WHEN** o usuário tem 2 notificações não lidas
- **THEN** o sino exibe o contador "2"

#### Scenario: Abrir e fechar o menu

- **WHEN** o usuário clica no sino e depois clica fora do menu
- **THEN** o menu abre com a lista e fecha ao clicar fora

#### Scenario: Altura da barra preservada

- **WHEN** o sino é exibido com ou sem contador
- **THEN** a altura da barra continua com no máximo 1,5 cm
