# Tasks

## 1. Novo fixture em conftest.py

- [ ] 1.1 Em `backend-django/api/tests/conftest.py`, adicionar fixture `product_b_archived` que cria um produto do tenant B com `arquivado=true` (necessário para o teste de restauração cross-tenant).

## 2. Novos testes na classe TestCrossTenant

- [ ] 2.1 `test_tenant_a_nao_deleta_produto_b` — `DELETE /api/products/{product_b["id"]}` com token de tenant A; espera 403, 404 ou 405.
- [ ] 2.2 `test_tenant_a_nao_faz_entrada_no_produto_b` — `POST /api/products/{product_b["id"]}/entry` com `{"quantidade": 1}` e token de tenant A; espera 403 ou 404.
- [ ] 2.3 `test_tenant_a_nao_faz_saida_no_produto_b` — `POST /api/products/{product_b["id"]}/withdraw` com `{"quantidade": 1}` e token de tenant A; espera 403 ou 404.
- [ ] 2.4 `test_tenant_a_nao_arquiva_produto_b` — `POST /api/products/{product_b["id"]}/archive` com token de tenant A; espera 403 ou 404.
- [ ] 2.5 `test_tenant_a_nao_restaura_produto_b_arquivado` — `POST /api/products/{product_b_archived["id"]}/restore` com token de tenant A; espera 403 ou 404.
- [ ] 2.6 `test_relatorio_tenant_a_nao_inclui_movimentos_do_tenant_b` — inserir movimento de entrada com `quantidade=100` para `product_b` via `connection.cursor()`; chamar `GET /api/reports?from=2000-01-01&to=2099-12-31` com token de tenant A; verificar que `totalEntradas` da resposta é `0.0` (tenant A não tem movimentos).
- [ ] 2.7 `test_usuarios_movimentos_tenant_a_isolados_do_tenant_b` — inserir movimento de tenant B com `user_nome='Espiao B'` via `connection.cursor()`; chamar `GET /api/movements/users` com token de tenant A; verificar que `'Espiao B'` não está na lista.
- [ ] 2.8 `test_notificacao_tenant_b_nao_dispensavel_por_tenant_a` — inserir notificação com `usuario_id=tenant_b["id"]` via `connection.cursor()`; chamar `POST /api/notificacoes/{id}/dispensar` com token de tenant A; espera 404; verificar que a notificação permanece `dispensada=false` no banco.

## 3. Verificação

- [ ] 3.1 Avisar Lucas e aguardar autorização antes de rodar pytest. Depois confirmar que nenhum dado de teste sobrou no Supabase.
- [ ] 3.2 Rodar `pytest api/tests/test_ataques_simulados.py -v` a partir de `backend-django/`; confirmar que todos os novos testes passam e os existentes não regridem.

## Workflow follow-up

- Arquivar a change após os testes passarem e Lucas aprovar.
- Passar ao Bloco 4 (`documentos-lgpd`) somente após o arquivamento.
