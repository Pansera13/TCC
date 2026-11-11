# Proposal

## Why

A classe `TestCrossTenant` em `test_ataques_simulados.py` cobre apenas 4 dos 12 endpoints que lidam com dados por tenant (GET produtos, PUT/PATCH produto, GET movimentações). Os outros 8 — DELETE produto, POST entrada/retirada, POST arquivar/restaurar, GET relatórios, GET usuários de movimentações e POST dispensar notificação — têm isolamento implementado no código, mas nenhum teste o verifica. Sem esses testes, qualquer regressão no filtro de `tenant_id` passaria despercebida.

## What Changes

- Adicionar 8 novos testes à classe `TestCrossTenant` em `backend-django/api/tests/test_ataques_simulados.py`:
  - `test_tenant_a_nao_deleta_produto_b` — `DELETE /api/products/{id}` → 403/404/405
  - `test_tenant_a_nao_faz_entrada_no_produto_b` — `POST /api/products/{id}/entry` → 403/404
  - `test_tenant_a_nao_faz_saida_no_produto_b` — `POST /api/products/{id}/withdraw` → 403/404
  - `test_tenant_a_nao_arquiva_produto_b` — `POST /api/products/{id}/archive` → 403/404
  - `test_tenant_a_nao_restaura_produto_b_arquivado` — `POST /api/products/{id}/restore` → 403/404
  - `test_relatorio_tenant_a_nao_inclui_movimentos_do_tenant_b` — `GET /api/reports` não vaza totais de B
  - `test_usuarios_movimentos_tenant_a_isolados_do_tenant_b` — `GET /api/movements/users` não inclui usuários de B
  - `test_notificacao_tenant_b_nao_dispensavel_por_tenant_a` — `POST /api/notificacoes/{id}/dispensar` → 404
- Adicionar fixture `product_b_archived` ao `conftest.py` (produto B já arquivado, necessário para o teste de restauração).

## Capabilities

### New Capabilities

- `security/tenant-isolation`: Cobertura de testes que verifica o isolamento cross-tenant em operações de escrita (DELETE, entrada, saída, arquivar, restaurar) e leitura secundária (relatórios, usuários de movimentações, notificações).

### Modified Capabilities

*(nenhuma — os testes não alteram comportamento observável; apenas provam que o isolamento existente funciona)*

## Impact

- **`backend-django/api/tests/test_ataques_simulados.py`**: 8 novos métodos adicionados à classe `TestCrossTenant`.
- **`backend-django/api/tests/conftest.py`**: novo fixture `product_b_archived`.
- **Sem alteração de código de produção, sem nova rota, sem migração de banco.**
