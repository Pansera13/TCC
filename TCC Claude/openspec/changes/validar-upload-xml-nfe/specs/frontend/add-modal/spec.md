# Spec Delta

## Purpose

Melhora o tratamento de erros da tela de importação de NF-e para exibir os novos códigos de erro (413, 415, 422) usando a mensagem já retornada pelo backend, e adicionar um countdown para o bloqueio 429.

## MODIFIED Requirements

### Requirement: Exibição de erros de importação de NF-e

**Replaces:** "Exibição de erros de importação de NF-e" (spec base `frontend/add-modal`)

O componente `AddProductModal` SHALL exibir a mensagem de erro retornada pelo backend (`err.response?.data?.message`) para os códigos HTTP 400, 413, 415, 422 e 500. Para 429, além da mensagem, SHALL exibir um countdown em segundos até que a importação seja novamente permitida, usando o campo `retry_after` da resposta. O countdown SHALL decrementar a cada segundo usando `setInterval` e zerar quando `retry_after` expirar. O botão de importação SHALL ser desabilitado enquanto o countdown estiver ativo.

#### Scenario: Erro 413 exibe mensagem do backend
- **WHEN** o backend retorna 413 com `{"message": "Arquivo muito grande. Máximo: 2048 KB.", "limite_bytes": 2097152}`
- **THEN** o componente exibe "Arquivo muito grande. Máximo: 2048 KB." sem exigir mudanças adicionais

#### Scenario: Erro 415 exibe mensagem do backend
- **WHEN** o backend retorna 415 com `{"message": "Envie um arquivo no formato .xml."}`
- **THEN** o componente exibe "Envie um arquivo no formato .xml."

#### Scenario: Erro 429 com countdown
- **WHEN** o backend retorna 429 com `{"message": "Muitas tentativas. Tente novamente mais tarde.", "retry_after": 300}`
- **THEN** o componente exibe a mensagem e um contador regressivo "Tente novamente em <n>s", decrementando a cada segundo; o botão de importação fica desabilitado durante o bloqueio

#### Scenario: Countdown zera e botão é reativado
- **WHEN** o countdown do 429 chega a zero
- **THEN** o botão de importação é reabilitado e o countdown some
