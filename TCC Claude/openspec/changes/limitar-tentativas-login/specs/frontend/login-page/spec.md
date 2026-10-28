# Spec Delta

## ADDED Requirements

### Requirement: Bloqueio temporário ao receber 429

Quando o backend retornar HTTP 429 com `retry_after`, a tela de login SHALL exibir a mensagem do servidor e uma contagem regressiva em segundos, e SHALL desabilitar o botão "ENTRAR" até a contagem chegar a zero. O campo de identificador e o campo de senha DEVEM permanecer editáveis durante o bloqueio. Ao expirar o tempo, o botão SHALL ser reabilitado automaticamente sem necessidade de recarregar a página.

#### Scenario: Recebe 429 com retry_after

- **WHEN** a API retorna HTTP 429 com `{"message": "...", "retry_after": 60}`
- **THEN** o componente exibe a mensagem recebida e uma contagem regressiva de 60 segundos, e o botão "ENTRAR" fica desabilitado

#### Scenario: Contagem regressiva expira

- **WHEN** o contador chega a zero
- **THEN** o botão "ENTRAR" é reabilitado automaticamente e a mensagem de bloqueio some

#### Scenario: Outros erros não ativam contagem regressiva

- **WHEN** a API retorna 401 ou outro erro sem `retry_after`
- **THEN** a mensagem de erro é exibida normalmente sem contagem regressiva e o botão permanece habilitado
