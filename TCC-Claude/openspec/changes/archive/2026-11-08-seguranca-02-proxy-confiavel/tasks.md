# Tasks

## 1. api/limites.py — nova ip_do_cliente

- [x] 1.1 Substituir a função `ip_do_cliente` por versão com `TRUSTED_PROXY_COUNT`:
  - 0 → REMOTE_ADDR
  - N → N-ésimo da direita no X-Forwarded-For (ex.: N=1 pega o último; N=2 o penúltimo)
  - Fallback para o índice 0 se XFF tiver menos entradas do que N esperado
  - Remover referência a TRUSTED_PROXY do docstring do módulo
- [x] 1.2 Remover importação/uso de `TRUSTED_PROXY` do docstring do módulo (linha 8-9).

## 2. settings.py

- [x] 2.1 Trocar `os.environ.get('TRUSTED_PROXY', '').lower() == 'true'` por
  `int(os.environ.get('TRUSTED_PROXY_COUNT', '0')) > 0` ao definir
  `SECURE_PROXY_SSL_HEADER`.

## 3. .env.example

- [x] 3.1 Substituir bloco de TRUSTED_PROXY por TRUSTED_PROXY_COUNT, com comentário
  explicando a semântica e exemplo de 1 e 2 proxies.

## 4. Testes

- [x] 4.1 Atualizar os 3 testes existentes de `ip_do_cliente` em `test_rate_limit.py`
  para usar `TRUSTED_PROXY_COUNT` via monkeypatch.
- [x] 4.2 Adicionar `test_ip_count0_ignora_forjado`: com COUNT=0, XFF com IP forjado é
  ignorado e REMOTE_ADDR é usado.
- [x] 4.3 Adicionar `test_ip_count2_pega_segundo_da_direita`: com COUNT=2 e
  XFF="a, b, c", retorna "b" (2º da direita).
- [x] 4.4 Adicionar `test_ip_count_maior_que_entradas_usa_mais_antigo`: COUNT=5, XFF="a, b"
  retorna "a" (menos entradas que proxies esperados → fallback ao índice 0).
- [x] 4.5 Rodar `python -m pytest api/tests/test_rate_limit.py -v` — 0 falhas.

## 5. Verificação final

- [x] 5.1 Rodar `python -m pytest` completo — 0 falhas.

## Ação manual necessária pelo usuário

No arquivo `.env` (não commitado aqui por conter segredos), substituir:
```
TRUSTED_PROXY=false
```
por:
```
TRUSTED_PROXY_COUNT=0
```
(ou `TRUSTED_PROXY_COUNT=1` se havia `TRUSTED_PROXY=true`)
