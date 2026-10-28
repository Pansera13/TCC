# Tasks

## 1. Branch e scaffold

- [x] 1.1 Criar a branch `feature/limitar-tentativas-login` a partir de `main` e confirmar com `git log --oneline -1` que o commit base é o mesmo de `main`.
- [x] 1.2 Criar o arquivo `backend-django/api/limites.py` vazio e confirmar que `python -c "from api.limites import segundos_bloqueado"` roda sem erro.

## 2. Módulo api/limites.py

- [x] 2.1 Implementar `ip_do_cliente(request)` em `api/limites.py`: retorna `REMOTE_ADDR` por padrão; usa o primeiro IP de `X-Forwarded-For` somente quando `TRUSTED_PROXY=true`. Adicionar docstring documentando o risco de falsificação. Verificar com teste unitário que `TRUSTED_PROXY=false` ignora o header.
- [x] 2.2 Implementar `segundos_bloqueado(chave)` que retorna 0 se não há bloqueio ativo ou os segundos inteiros restantes calculados do timestamp de expiração. Verificar com teste unitário que retorna 0 para chave inexistente e o valor correto para bloqueio ativo.
- [x] 2.3 Implementar `registrar_falha(chave, janela_s, max_falhas, bloqueio_s)` usando `cache.add` para criar o contador (janela fixa) e `cache.incr` para incrementar. Quando `max_falhas` é atingido, gravar a chave de bloqueio `<chave>:bloq` com timestamp de expiração. Capturar `ValueError` do `cache.incr` (chave expirou entre `add` e `incr`) chamando `add` novamente. Registrar WARNING no logger `api.limites` com IP mascarado ao criar o bloqueio. Verificar com testes unitários: (a) a 5ª falha dentro da janela dispara o bloqueio; (b) a janela não reinicia nas tentativas intermediárias; (c) falhas após o bloqueio não alteram o timestamp de expiração.
- [x] 2.4 Implementar `limpar_contador(chave)` que remove `<chave>` e `<chave>:bloq` do cache. Verificar com teste unitário que após `limpar_contador` o `segundos_bloqueado` retorna 0.
- [x] 2.5 Criar o arquivo de testes `backend-django/api/tests/test_rate_limit.py` com os testes unitários acima usando `django.core.cache` real (LocMemCache) e `django.test.override_settings(CACHES=...)` para garantir isolamento entre testes. Verificar que `python -m pytest api/tests/test_rate_limit.py` passa com 0 falhas.

## 3. Login com rate limiting

- [x] 3.1 Em `api/views/auth.py`, importar `api.limites` e criar as chaves de rate limit: `login:ip:<ip>` usando `ip_do_cliente(request)` e `login:id:<sha256_hex[:16](identificador_normalizado)>`. No início da view, verificar ambas as chaves com `segundos_bloqueado`; se qualquer uma retornar > 0, retornar imediatamente HTTP 429 com `{"message": "Muitas tentativas. Tente novamente mais tarde.", "retry_after": <max dos dois>}` e cabeçalho `Retry-After`. Verificar com teste que a 6ª tentativa (5 falhas + 1 bloqueada) retorna 429 com `retry_after > 0`.
- [x] 3.2 Adicionar hash dummy pré-computado no módulo (um `bcrypt.hashpw(b'dummy', bcrypt.gensalt(rounds=4)).decode()` calculado uma vez no nível de módulo). Quando o identificador não existe, chamar `bcrypt.checkpw(senha.encode(), _DUMMY_HASH.encode())` antes de retornar 401, para equalizar o tempo com o caminho de senha errada. Verificar com teste que identificador inexistente retorna 401 com a mesma mensagem que senha errada, e que seu contador de identificador é incrementado (uma 2ª tentativa do mesmo identificador fictício conta).
- [x] 3.3 Após um login bem-sucedido, chamar `limpar_contador(chave_identificador)`. Não alterar o contador do IP. Verificar com teste que após 4 falhas + 1 sucesso, a próxima tentativa com senha errada começa o contador do zero (não bloqueia na tentativa 2).
- [x] 3.4 Garantir que conta desativada (retorno 403) NÃO chama `registrar_falha`. Verificar com teste que após 5 tentativas com conta desativada o sistema ainda retorna 403 (não 429).
- [x] 3.5 Confirmar que `python -m pytest` passa com todos os 48 testes anteriores + os novos testes de login.

## 4. Recuperação de senha com módulo centralizado

- [x] 4.1 Em `api/views/recuperacao.py`, remover as funções `_verificar_limite` e `_registrar_limite` e substituir pelo import de `api.limites`. Substituir as chamadas na view `enviar_codigo`: usar `segundos_bloqueado('recuperacao:conta:<id>')` e `segundos_bloqueado('recuperacao:ip:<ip>')` antes de enviar, e `registrar_falha('recuperacao:conta:<id>', HORA_S, 3, HORA_S)` e `registrar_falha('recuperacao:ip:<ip>', HORA_S, 10, HORA_S)` após o envio bem-sucedido. Verificar que os limites atuais (3 por conta/hora, 10 por IP/hora) continuam funcionando.
- [x] 4.2 Remover a dependência de `cache.ttl` em toda a view `recuperacao.py`. Verificar que nenhuma chamada a `cache.ttl` existe no arquivo (`grep -n "cache.ttl" api/views/recuperacao.py` deve retornar vazio).
- [x] 4.3 Confirmar que a resposta 429 da recuperação passa a incluir `retry_after` real: escrever teste que verifica que o `retry_after` retornado após o 4º envio (acima do limite de 3) é > 0 e ≤ 3600. Verificar com `python -m pytest`.

## 5. Cadastro com rate limiting

- [x] 5.1 Em `api/views/auth.py`, na view `register`, verificar `segundos_bloqueado('register:ip:<ip>')` no início. Se bloqueado, retornar HTTP 429. Após cada tentativa de cadastro (inclusive 400 e 409), chamar `registrar_falha('register:ip:<ip>', REGISTER_JANELA_SEGUNDOS, REGISTER_MAX_FALHAS, REGISTER_BLOQUEIO_SEGUNDOS)`. Verificar com teste que a 11ª tentativa do mesmo IP retorna 429.

## 6. Configuração por variáveis de ambiente

- [x] 6.1 Ler as variáveis `LOGIN_MAX_FALHAS` (default 5), `LOGIN_JANELA_SEGUNDOS` (default 900), `LOGIN_BLOQUEIO_SEGUNDOS` (default 900), `REGISTER_MAX_FALHAS` (default 10), `REGISTER_JANELA_SEGUNDOS` (default 3600), `REGISTER_BLOQUEIO_SEGUNDOS` (default 3600) em `api/limites.py` ou nos pontos de chamada. Verificar que ao setar `LOGIN_MAX_FALHAS=2` no ambiente de testes, o bloqueio ocorre na 3ª tentativa.
- [x] 6.2 Adicionar ao `backend-django/.env.example` as variáveis de rate limit com valores fictícios e comentários, incluindo o risco de `TRUSTED_PROXY=true` (falsificação de IP). Verificar visualmente que o arquivo está correto e sem valores reais.
- [x] 6.3 Configurar o logger `api.limites` em `settings.py`: adicionar bloco `LOGGING` com handler de console e formatter simples. Verificar com `python -m pytest -s api/tests/test_rate_limit.py -k "bloqueio"` que os WARNINGs aparecem no console.

## 7. Frontend — tela de login com 429

- [x] 7.1 Em `frontend/src/pages/Login.jsx`, no bloco `catch` do `handleSubmit`, detectar `err.response?.status === 429`. Se sim, ler `err.response.data?.retry_after` (inteiro de segundos) e iniciar um `setInterval` de 1 segundo que decrementa o contador, exibe `<mensagem> Aguarde X segundos.` no estado de erro e desabilita o botão. Ao chegar em zero, limpar o interval, limpar o erro e reabilitar o botão. Verificar manualmente simulando resposta 429 com `retry_after: 5` via DevTools (ou mock) que o botão desabilita por 5 segundos e reabilita.
- [x] 7.2 Garantir que erros sem `retry_after` (ex.: 401) continuam funcionando como antes: mensagem de erro exibida, botão habilitado, sem contagem. Verificar manualmente que o login com senha errada ainda funciona normalmente.

## 8. Documentação, testes de integração e vault

- [x] 8.1 Escrever os testes de integração finais em `test_rate_limit.py` que ainda faltam após os grupos anteriores: (a) mesmo identificador de IPs diferentes → bloqueio por identificador; (b) após o tempo de bloqueio o acesso volta (usar `cache.clear()` para simular expiração); (c) `python -m pytest` mostrando 0 falhas nos ≥ 57 testes (48 anteriores + ≥ 9 novos).
- [x] 8.2 Atualizar `README.md` na raiz: adicionar/atualizar a tabela de variáveis de ambiente com as novas vars de rate limit (`LOGIN_MAX_FALHAS` etc.) e documentar o `TRUSTED_PROXY`. Verificar que o README está correto.
- [x] 8.3 Atualizar a matriz de rastreabilidade no vault (`C:\Users\lucas\Documents\TCC\TCC\02 - Requisitos\Requisitos (rastreabilidade).md`): adicionar os novos requisitos desta change com spec (`security/rate-limiting`), código (`api/limites.py`, `api/views/auth.py`, `api/views/recuperacao.py`), teste (`api/tests/test_rate_limit.py`) e status "Atendido". Verificar que o arquivo foi salvo.
- [x] 8.4 Registrar esta change em `C:\Users\lucas\Documents\TCC\TCC\03 - Metricas\Registro de metricas.md`: data de início/fim, tempo de especificação, implementação, testes e correção, erros encontrados, retrabalhos e intervenções. Verificar que o arquivo foi salvo.
- [x] 8.5 Atualizar o diário do dia (`C:\Users\lucas\Documents\TCC\TCC\05 - Diario\<data>.md`) com resumo do que foi implementado. Verificar que o arquivo foi salvo.

## Workflow follow-up

- Após revisão e aprovação dos artefatos: executar `/opsx:apply` para iniciar a implementação.
- Após implementação: commitar com mensagem descritiva na branch `feature/limitar-tentativas-login` e abrir PR para `main`.
- Após merge: executar `/opsx:archive limitar-tentativas-login` para arquivar a change.
