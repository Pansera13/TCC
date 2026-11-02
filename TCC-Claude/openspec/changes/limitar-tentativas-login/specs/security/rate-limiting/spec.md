# Spec Delta

## Purpose

Módulo centralizado de rate limiting por IP e por identificador que protege os endpoints de autenticação (login, cadastro, recuperação de senha) contra força bruta, enumeração de contas e abuso automatizado, usando apenas o framework de cache do Django.

## ADDED Requirements

### Requirement: Módulo limites.py com janela fixa

O sistema SHALL fornecer `api/limites.py` com três funções públicas: `segundos_bloqueado(chave)` (retorna 0 se liberado, ou segundos restantes), `registrar_falha(chave, janela_s, max_falhas, bloqueio_s)` (registra uma falha e aplica bloqueio quando o limite é atingido) e `limpar_contador(chave)` (zera o contador após login bem-sucedido). O contador SHALL ser criado com `cache.add` para garantir janela fixa: a primeira falha inicia a janela e as seguintes apenas incrementam sem reiniciar o TTL. O bloqueio SHALL ser armazenado como timestamp de expiração, permitindo calcular `retry_after` real.

#### Scenario: Primeira falha inicia janela fixa

- **WHEN** `registrar_falha` é chamado pela primeira vez para uma chave
- **THEN** o cache cria o contador com TTL igual a `janela_s` e o bloqueio não é aplicado

#### Scenario: Falhas subsequentes não reiniciam a janela

- **WHEN** `registrar_falha` é chamado N vezes dentro da janela para a mesma chave
- **THEN** o TTL da janela não é estendido a cada chamada; a 5ª falha (ou conforme `max_falhas`) dispara o bloqueio

#### Scenario: Bloqueio informa retry_after real

- **WHEN** `segundos_bloqueado` é chamado durante o bloqueio ativo
- **THEN** retorna os segundos reais restantes calculados a partir do timestamp de expiração, não um valor fixo

#### Scenario: Limpar contador após login bem-sucedido

- **WHEN** `limpar_contador` é chamado para a chave do identificador
- **THEN** o contador e o bloqueio do identificador são removidos do cache; o contador do IP não é afetado

### Requirement: Rate limiting do login por IP e por identificador

O endpoint de login SHALL verificar separadamente dois limitadores antes de processar as credenciais: um por IP do cliente e outro pelo identificador normalizado (e-mail, CPF/CNPJ ou nome da empresa em minúsculas sem espaços). Os padrões SHALL ser configuráveis por variáveis de ambiente (`LOGIN_MAX_FALHAS`, `LOGIN_JANELA_SEGUNDOS`, `LOGIN_BLOQUEIO_SEGUNDOS`) com defaults 5, 900 e 900. Somente falhas de autenticação incrementam os contadores; conta desativada (403) NÃO incrementa. Login bem-sucedido zera o contador do identificador.

#### Scenario: 5 falhas pelo mesmo identificador bloqueiam o identificador

- **WHEN** o mesmo identificador falha 5 vezes dentro de 15 minutos, independentemente do IP
- **THEN** a 6ª tentativa retorna HTTP 429 com `retry_after` > 0 e cabeçalho `Retry-After`, sem processar as credenciais

#### Scenario: 5 falhas do mesmo IP com identificadores diferentes bloqueiam o IP

- **WHEN** o mesmo IP falha 5 vezes em 15 minutos usando identificadores distintos
- **THEN** qualquer nova tentativa desse IP retorna HTTP 429, independentemente do identificador

#### Scenario: Identificador inexistente conta como falha

- **WHEN** o login recebe um identificador que não existe no banco
- **THEN** o sistema registra a falha no contador do identificador, retorna a mesma mensagem de erro e o mesmo status que uma senha errada, sem diferença de tempo observável

#### Scenario: Conta desativada não conta como falha

- **WHEN** login recebe credenciais corretas de uma conta desativada
- **THEN** o sistema retorna 403 e não incrementa nenhum contador de rate limit

#### Scenario: Login correto zera o identificador

- **WHEN** login recebe credenciais corretas de uma conta ativa
- **THEN** o contador do identificador é zerado; o do IP não é alterado

### Requirement: Rate limiting do cadastro por IP

O endpoint de cadastro SHALL limitar tentativas por IP. O padrão SHALL ser 10 tentativas por hora, configurável via variáveis de ambiente (`REGISTER_MAX_FALHAS`, `REGISTER_JANELA_SEGUNDOS`, `REGISTER_BLOQUEIO_SEGUNDOS`). Somente requisições que chegam ao endpoint contam; respostas 400/409 de validação também incrementam.

#### Scenario: Excesso de cadastros pelo mesmo IP

- **WHEN** o mesmo IP tenta cadastrar mais de 10 vezes em 1 hora
- **THEN** o sistema retorna HTTP 429 com `retry_after` e cabeçalho `Retry-After`

### Requirement: Resposta 429 padronizada

Quando qualquer limitador bloquear uma requisição, o sistema SHALL retornar HTTP 429 com corpo `{"message": "Muitas tentativas. Tente novamente mais tarde.", "retry_after": <inteiro>}` e cabeçalho `Retry-After: <inteiro>` com o mesmo valor. O `retry_after` SHALL ser os segundos reais restantes do bloqueio mais restritivo ativo.

#### Scenario: Body e header coerentes

- **WHEN** uma requisição é bloqueada por rate limit
- **THEN** o JSON contém `retry_after` com valor igual ao do cabeçalho `Retry-After`, ambos refletindo os segundos reais restantes

### Requirement: Log de bloqueios

O sistema SHALL registrar cada novo bloqueio no logger `api.limites` no nível WARNING com o IP do cliente e o identificador mascarado (primeiros 2 caracteres + `***`), sem incluir senhas ou dados completos.

#### Scenario: Bloqueio por IP gera log

- **WHEN** o limite de IP é atingido pela primeira vez
- **THEN** um registro WARNING é emitido com o IP e a chave mascarada

### Requirement: IP do cliente com controle de proxy

O sistema SHALL expor uma função `ip_do_cliente(request)` que usa `REMOTE_ADDR` por padrão. Somente quando a variável de ambiente `TRUSTED_PROXY=true`, o primeiro endereço do cabeçalho `X-Forwarded-For` é usado. Sem `TRUSTED_PROXY=true`, `X-Forwarded-For` é completamente ignorado.

#### Scenario: TRUSTED_PROXY desativado ignora X-Forwarded-For

- **WHEN** `TRUSTED_PROXY` não está definido ou é `false` e a requisição tem cabeçalho `X-Forwarded-For`
- **THEN** o IP registrado é `REMOTE_ADDR`, não o valor de `X-Forwarded-For`

#### Scenario: TRUSTED_PROXY ativo usa X-Forwarded-For

- **WHEN** `TRUSTED_PROXY=true` e a requisição tem cabeçalho `X-Forwarded-For: 1.2.3.4, 10.0.0.1`
- **THEN** o IP registrado é `1.2.3.4`
