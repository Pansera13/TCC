# Tasks

## 1. Branch e estrutura base Django

- [x] 1.1 Criar branch `feature/django-backend` a partir de `main` e confirmar que `backend/` (Node) continua inalterado nela — verificar com `git log --oneline -3` que o commit de base é o mesmo de `main`.
- [x] 1.2 Criar `backend-django/` com `django-admin startproject stockflow .` e um único app `python manage.py startapp api` — verificar que `backend-django/manage.py` e `backend-django/api/` existem.
- [x] 1.3 Criar `backend-django/requirements.txt` com: `django`, `djangorestframework`, `psycopg2-binary`, `PyJWT`, `bcrypt`, `requests`, `defusedxml`, `django-ratelimit`, `pytest-django`, `pytest-cov` — verificar com `pip install -r requirements.txt` sem erros.
- [x] 1.4 Criar `backend-django/.env.example` com `DATABASE_URL`, `JWT_SECRET`, `JWT_RESET_SECRET`, `RESEND_API_KEY`, `RECAPTCHA_SECRET`, `EMAIL_FROM`, `ALLOWED_ORIGINS`, `PORT` com valores fictícios; adicionar `backend-django/.env` ao `.gitignore` — verificar que `.env` não aparece em `git status`.
- [x] 1.5 Configurar `settings.py`: `DATABASES` lendo `DATABASE_URL`, `REST_FRAMEWORK` com autenticação desabilitada globalmente (auth por middleware próprio), `ALLOWED_HOSTS = ['*']`, `INSTALLED_APPS` com `'rest_framework'` e `'api'` — verificar com `python manage.py check` sem erros.
- [x] 1.6 Configurar CORS em `settings.py` lendo `ALLOWED_ORIGINS` do ambiente (fallback: localhost + RFC 1918) — verificar que uma requisição de `http://localhost:5173` recebe header `Access-Control-Allow-Origin`.
- [x] 1.7 Definir os models Django com `managed = False` em `api/models.py`: `Usuario`, `Product`, `Movement`, `Notificacao` mapeando exatamente as colunas de `Banco de dados.md` — verificar com `python manage.py migrate --run-syncdb` que nenhuma tabela é criada ou alterada e `python manage.py check` passa sem erros.
- [x] 1.8 Rodar `python manage.py runserver 3001` e confirmar que `http://localhost:3001/api/` responde 404 JSON (não HTML) — serve de smoke test da configuração base.

## 2. Middleware de autenticação JWT e permissões

- [x] 2.1 Implementar `api/middleware.py` com `JWTAuthMiddleware`: extrai Bearer token, verifica com PyJWT, relê `role`/`ativo`/`tenant_id`/`nome` do banco via `Usuario.objects.values(...)`, injeta em `request.user_data`; retorna 401 em token ausente/inválido, 401 com "Sua sessão expirou." em expirado, 401 em conta não encontrada ou desativada, 503 em falha de banco — verificar com testes unitários cobrindo cada cenário do spec `auth/backend`.
- [x] 2.2 Implementar `api/permissions.py` com a matriz de permissões idêntica a `backend/src/utils/permissoes.js`: `NIVEIS`, `PERMISSOES`, funções `can`, `permissoes_do_cargo`, `pode_alterar_conta`, `pode_criar_cargo` — verificar com `pytest api/tests/test_permissions.py` que todos os 20 casos da matriz passam (cada permissão vs. cada cargo).
- [x] 2.3 Implementar decorator/helper `exige_permissao(permissao)` que usa `can(request.user_data['role'], permissao)` e retorna 403 `{"message": "Você não tem permissão para esta ação."}` — verificar que requisição de Funcionário em rota de Sócio retorna 403 JSON.

## 3. Auth: cadastro e login

- [x] 3.1 Implementar `POST /api/auth/register` em `api/views/auth.py`: validar campos obrigatórios, normalizar e-mail de recuperação com lógica equivalente a `emailRecuperacao.js`, verificar reCAPTCHA se `RECAPTCHA_SECRET` presente, checar unicidade de e-mail e CPF/CNPJ, gerar hash bcrypt custo 12, inserir usuário com `tenant_id = id` — verificar com pytest que retorna 201 em sucesso, 400 em e-mail de recuperação inválido, 409 em e-mail duplicado.
- [x] 3.2 Implementar `POST /api/auth/login`: aceitar identificador (e-mail, CPF ou CNPJ), buscar conta, verificar hash com `bcrypt.checkpw`, checar `ativo`, emitir JWT 8h, retornar `{token, nome, role, id, avatar_url, permissoes}` — verificar com pytest que retorna 200 com todos os campos, 401 em credenciais erradas, 403 em conta desativada.
- [x] 3.3 Verificar que hash gerado pelo Node (`$2b$12$...`) é aceito pelo `bcrypt.checkpw` Python — escrever teste específico: gerar hash fixo conhecido com `bcrypt` npm no shell e verificar com Python.

## 4. Produtos: CRUD e operações de estoque

- [x] 4.1 Implementar `GET /api/products` (lista ativa e arquivados com `?arquivados=1`) com filtro `tenant_id` e verificação de permissão `produto:ver-arquivados` para arquivados — verificar com pytest que Funcionário vê lista ativa, recebe 403 em `?arquivados=1`, e Admin vê arquivados.
- [x] 4.2 Implementar `POST /api/products` (criar produto + movimentação de entrada) com validações de nome/quantidade/unidade — verificar com pytest que retorna 201, movimentação de entrada aparece em `movements` e tenant_id está correto.
- [x] 4.3 Implementar `PUT /api/products/:id` (editar produto + movimentação de edição com campos antes/depois em JSONB) — verificar com pytest que campos alterados aparecem em `detalhes` da movimentação e produto arquivado retorna 409.
- [x] 4.4 Implementar `DELETE /api/products/:id` com tratamento de FK violation (23503 → 409) + movimentação de remoção — verificar com pytest que produto vinculado retorna 409 e produto removido gera movimentação do tipo `remocao`.
- [x] 4.5 Implementar `POST /api/products/:id/withdraw` com SELECT FOR UPDATE dentro de `transaction.atomic()`: ler saldo, validar, subtrair, registrar movimentação de saída na mesma transação — verificar com pytest que `rowcount` nunca resulta em saldo negativo e que movimentação é criada na mesma transação (rollback apaga ambos).
- [x] 4.6 Implementar `POST /api/products/:id/entry` com SELECT FOR UPDATE dentro de `transaction.atomic()`: ler produto, validar arquivado, somar estoque, registrar movimentação de entrada — verificar com pytest que produto arquivado retorna 409 e movimentação aparece com `origem='estoque'`.
- [x] 4.7 Implementar `POST /api/products/:id/archive` e `POST /api/products/:id/restore` com movimentação de edição (antes/depois de `arquivado`) — verificar com pytest que arquivar produto ativo retorna 200, arquivar produto já arquivado retorna 409, restaurar produto ativo retorna 409.

## 5. Movimentações: histórico e filtros

- [x] 5.1 Implementar `GET /api/movements` com todos os filtros (`user`, `tipo`, `q`, `from`, `to`, `orderBy`, `orderDir`) e paginação (`page`, `pageSize`, máx. 100); Funcionário filtra automaticamente por `user_id` — verificar com pytest que resposta tem formato `{items, total, page, pageSize}`, filtros funcionam individualmente e em combinação, e Funcionário não vê movimentações de outros.
- [x] 5.2 Implementar `GET /api/movements/users` (nomes distintos de quem agiu no estoque, filtrado por `origem='estoque'` e `tenant_id`) — verificar com pytest que retorna lista ordenada e não inclui usuários de outros tenants.

## 6. Equipe: gestão de usuários

- [x] 6.1 Implementar `GET /api/users` (lista equipe do tenant) e `POST /api/users` (criar usuário com herança de `tenant_id` do admin, regras de cargo via `pode_criar_cargo`) — verificar com pytest que Sócio pode criar Funcionário, recebe 403 ao tentar criar Sócio, e e-mail/CPF duplicado retorna 409.
- [x] 6.2 Implementar `PUT /api/users/:id/role` (alterar cargo com `pode_alterar_conta`, bloquear alteração do próprio cargo) e `PUT /api/users/:id/status` (ativar/desativar, bloquear própria conta) — verificar com pytest que ninguém altera o próprio cargo, Sócio recebe 403 ao alterar conta de Admin.
- [x] 6.3 Implementar `DELETE /api/users/:id` (excluir usuário com verificação de `pode_alterar_conta`, bloquear auto-exclusão) — verificar com pytest que exclusão do próprio usuário retorna 403 e que usuário de outro tenant retorna 404.

## 7. Recuperação de senha

- [x] 7.1 Implementar `POST /api/auth/recuperacao/buscar`: identificar conta (e-mail/CPF/CNPJ), verificar reCAPTCHA se configurado, checar `semSaida` (conta_equipe 403, conta_desativada 403, sem_email 422), emitir `busca_token` JWT 10min com escopo `recuperacao-busca`, retornar nome e e-mail mascarados — verificar com pytest cobrindo cada caso de bloqueio e o caso de sucesso com dados mascarados.
- [x] 7.2 Implementar `POST /api/auth/recuperacao/enviar-codigo`: validar `busca_token`, verificar intervalo de 60s desde último envio, verificar rate limit (3/conta/hora + 10/IP/hora), gerar código criptográfico de 6 dígitos com `secrets.randbelow`, salvar HMAC-SHA256 no banco, enviar via Resend; em falha de envio apagar código e retornar 502 sem consumir quota — verificar com pytest que 429 é retornado antes de 60s, que falha de Resend não grava código e que `reenvio_em` está presente na resposta de sucesso.
- [x] 7.3 Implementar `POST /api/auth/recuperacao/verificar-codigo`: validar `busca_token`, verificar vigência do código, comparar HMAC com `hmac.compare_digest`, incrementar tentativas (apagar após 5 erros), retornar `reset_token` JWT com impressão do hash — verificar com pytest que 5a tentativa errada apaga o código e que código correto retorna `reset_token`.
- [x] 7.4 Implementar `POST /api/auth/recuperacao/redefinir-senha`: validar `reset_token` (escopo + impressão do hash), verificar senha ≥ 8 chars, atualizar `senha_hash` bcrypt custo 12, apagar código — verificar com pytest que token já usado retorna 400, senha curta retorna 400 com `field: 'nova_senha'` e sucesso retorna 200 com "Senha alterada com sucesso!".

## 8. NF-e e código de barras

- [x] 8.1 Implementar `POST /api/nfe/xml` (upload via multipart) com `defusedxml.ElementTree` para parsing seguro: detectar `nfeProc/NFe/infNFe` ou `NFe/infNFe`, extrair `xProd`, `qCom`/`qTrib`, `uCom`/`uTrib`, `pesoL`; rejeitar XML inválido (400) e formato não reconhecido (422); limite de tamanho (configurável em `settings.py`) — verificar com pytest usando um XML de NF-e real exportado do frontend e confirmar que produtos são extraídos corretamente.
- [x] 8.2 Implementar `GET /api/products/barcode/:codigo` consultando Cosmos API e Open Food Facts com fallback, retornando `{nome, unidade, peso_kg}` ou 404 se não encontrado — verificar com pytest mockando as APIs externas para confirmar formato de resposta e fallback.

## 9. Relatórios

- [x] 9.1 Implementar `GET /api/reports?from=&to=` com as 5 queries analíticas usando SQL bruto (equivalente a `reportController.js`): estoque total/baixo/esgotados, totais de entrada/saída no período, top 10 retirados, giro de estoque, consumo por categoria — verificar com pytest que os 5 campos de `summary`, `topRetirados`, `giro` e `consumoPorCategoria` estão presentes na resposta e período > 366 dias retorna 400.
- [x] 9.2 Verificar que `baixo` usa o limiar `LOW_STOCK_THRESHOLD = 3` e que produtos arquivados são excluídos de todos os cálculos — escrever pytest com fixture de produtos arquivados e confirmar que não aparecem em nenhuma seção do relatório.

## 10. Perfil e notificações

- [x] 10.1 Implementar `GET /api/profile` (retorna perfil do usuário autenticado) e `PUT /api/profile` (atualiza nome e avatar_url) — verificar com pytest que GET retorna os campos esperados e PUT atualiza apenas os campos enviados.
- [x] 10.2 Implementar `PUT /api/profile/email-recuperacao` com as mesmas validações de `emailRecuperacao.js` (domínios bloqueados, confirmação obrigatória, sugestão de domínio) — verificar com pytest que e-mail inválido retorna 400 com `field` e `sugestao`.
- [x] 10.3 Implementar `GET /api/notificacoes`, `POST /api/notificacoes/marcar-lidas` e `POST /api/notificacoes/:id/dispensar` filtrados por `usuario_id` — verificar com pytest que `GET` retorna `{itens, nao_lidas}`, que `marcar-lidas` zera o contador, e que dispensar notificação de outro usuário retorna 404.

## 11. Testes de contrato e integração

- [x] 11.1 Escrever testes de contrato parametrizados para as respostas de login e listagem de produtos: campos presentes, tipos corretos, isolamento por tenant — verificar que os testes passam e que a resposta de login contém exatamente `{token, nome, role, id, avatar_url, permissoes}`.
- [x] 11.2 Escrever testes de contrato para erros padronizados (400 com `message`, 403, 404, 429 com `retry_after`) em pelo menos 5 endpoints — verificar que Content-Type é `application/json` em todos os casos de erro.
- [x] 11.3 Escrever testes de contrato para isolamento por tenant: dois tenants distintos com produtos diferentes, cada um listando apenas os seus — verificar que zero produtos do outro tenant aparecem em qualquer resposta.
- [x] 11.4 Escrever teste de concorrência simulada para SELECT FOR UPDATE: duas threads chamam retirada do mesmo produto com estoque 1, quantidade 1 cada — verificar que exatamente uma recebe 200 e outra recebe 400 "Estoque insuficiente".
- [x] 11.5 Executar `pytest --cov=api --cov-report=term-missing` e confirmar cobertura ≥ 80% das views e ≥ 90% das permissões — gerar relatório `backend-django/coverage.txt` como evidência.

## 12. Documentação e entrega TCC

- [x] 12.1 Atualizar `README.md` na raiz: adicionar seção "Backend Django" com instruções de setup (`python -m venv`, `pip install -r requirements.txt`, `cp .env.example .env`, `python manage.py migrate --run-syncdb`, `python manage.py runserver`) — verificar que um desenvolvedor consegue subir o backend Django seguindo apenas o README.
- [x] 12.2 Atualizar `backend-django/.env.example` com todos os valores fictícios e comentários explicativos para cada variável — verificar que nenhum valor real está no arquivo.
- [x] 12.3 Atualizar a seção "Recursos tecnológicos" da monografia no vault (`04 - Proposta e TCC`) para refletir Python/Django/DRF — verificar que a tabela de stack não menciona mais Node.js como backend.
- [x] 12.4 Preencher `03 - Metricas/Registro de metricas.md` com os dados desta migração: data de início, tempo gasto por etapa (especificação, implementação, testes, correção), erros encontrados, retrabalhos e intervenções humanas — verificar que o arquivo tem linha para cada etapa concluída.
- [x] 12.5 Verificar paridade manual: subir Django na porta 3002 e Node na 3001, apontar o frontend para cada um alternadamente e confirmar que todas as telas funcionam sem erros de console — registrar resultado em `03 - Metricas`.

## Workflow follow-up

- Após paridade confirmada: fazer merge de `feature/django-backend` em `main`, desligar o servidor Node, remover a referência ao `backend/` das instruções de start.
- Arquivar este change com `/opsx:archive` após a entrega do TCC.
- Atualizar a matriz de rastreabilidade em `02 - Requisitos` marcando os requisitos cobertos pelos novos specs como "Atendido" com link para o código Django.
