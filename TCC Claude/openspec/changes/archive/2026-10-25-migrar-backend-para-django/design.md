# Design

## Context

Ver `proposal.md — Why` para a motivação. O backend Node atual tem ~1.800 linhas distribuídas em 8 controllers, 8 rotas, 3 middlewares e 4 serviços. Ele usa `pg` (pool de conexões), `jsonwebtoken`, `bcrypt`, `axios` (Resend), `xml2js` (NF-e) e `multer` (upload). O banco está no Supabase (PostgreSQL 15) e não pode sofrer alterações estruturais.

Restrições que moldam o design:
- Hashes bcrypt custo 12 já gravados devem continuar válidos.
- Tabelas mapeadas com `managed = False`; `manage.py migrate` não pode criar, alterar ou remover nada.
- Frontend React aponta para `VITE_API_URL`; o único ajuste necessário é trocar o valor dessa variável.
- O projeto PEDIDOS usa o mesmo banco via `pagar_pedido`; a função e suas tabelas são intocáveis.
- Branch separada (`feature/django-backend`); o backend Node permanece em `backend/` e continua funcional até a paridade ser provada.

## Goals / Non-Goals

**Goals:**
- Paridade comportamental total: mesmas rotas, métodos, status HTTP, campos JSON, mensagens de erro.
- Compatibilidade com hashes bcrypt existentes sem migração de dados.
- SELECT FOR UPDATE em entrada e retirada de estoque (lacuna de consistência fechada).
- Suíte pytest-django com um único comando e testes de contrato.
- Zero alterações no banco ou no frontend React.

**Non-Goals:**
- Migração de quaisquer dados ou tabelas.
- Alteração de qualquer tela ou componente React.
- Reescrita de specs já existentes que descrevem comportamento inalterado (auth, produtos, movimentações, relatórios, equipe, notificações).
- Implementação de funcionalidades novas além das listadas no proposal.
- Deploy em produção (fora do escopo do TCC).

## Decisions

### D1 — Estrutura do projeto Django

**Decisão**: projeto Django em `backend-django/` com um único app `api/` contendo todos os models, views, serializers e urls. Sem app por domínio.

**Razão**: o backend é pequeno (~30 endpoints, sem lógica de negócio complexa entre domínios). Um único app evita boilerplate de múltiplos `apps.py` e importações cruzadas. A separação por módulo dentro de `api/` (ex.: `api/views/products.py`) já é suficiente.

**Alternativa rejeitada**: um app por domínio (`auth`, `products`, `movements`...) — overhead desnecessário para este porte.

### D2 — ORM vs. SQL bruto

**Decisão**: usar Django ORM para leituras e escritas simples; SQL bruto (`connection.execute`) apenas nos relatórios (queries analíticas complexas com múltiplos JOINs e `FILTER`/`AT TIME ZONE`) e na operação SELECT FOR UPDATE das movimentações.

**Razão**: o ORM elimina a maioria do SQL repetitivo (CRUD de produtos, equipe, notificações) enquanto SQL bruto garante controle total nas queries críticas que dependem de sintaxe PostgreSQL específica (fuso `America/Sao_Paulo`, `ILIKE`, `JSONB`).

**Alternativa rejeitada**: SQL bruto em tudo — elimina as vantagens do ORM e aumenta a superfície de SQL injection.

### D3 — Autenticação JWT sem django-rest-framework-simplejwt

**Decisão**: implementar o middleware JWT manualmente (verificar com `PyJWT`, reler conta do banco), não usar simplejwt.

**Razão**: o requisito de reler cargo/ativo/tenant_id do banco a cada requisição é incompatível com o fluxo padrão do simplejwt (que confia no payload do token). A lógica equivale a ~40 linhas em `api/middleware.py` e mapeia 1:1 com o `auth.js` do Node — mais fácil de auditar pelo orientador.

**Alternativa rejeitada**: simplejwt com blacklist — introduz tabela nova no banco e complexidade desnecessária.

### D4 — bcrypt Python para hashes Node

**Decisão**: usar o pacote `bcrypt` (Python) que é wrapper do mesmo libsodium/OpenSSL que o `bcrypt` npm usa. Hashes `$2b$12$...` são idênticos entre as duas implementações.

**Razão**: compatibilidade binária garantida; nenhum dado precisa ser migrado. Confirmado pela RFC do bcrypt: prefixo `$2b$` é intercambiável entre implementações compatíveis.

### D5 — Parser NF-e com defusedxml

**Decisão**: substituir `xml2js` por `defusedxml.ElementTree` para parsing de NF-e XML.

**Razão**: `defusedxml` previne XXE (XML External Entity) e billion-laughs por padrão, satisfazendo o requisito de "parser seguro, sem entidades externas". `xml2js` não tem proteção equivalente sem configuração manual.

**Alternativa rejeitada**: `lxml` com configuração manual de parser seguro — mais verboso e sem vantagem para este caso de uso.

### D6 — Rate limit via django-ratelimit

**Decisão**: usar `django-ratelimit` com backend em memória (cache Django padrão) para as rotas de recuperação de senha.

**Razão**: paridade com o rate limit em memória do Node (`criarLimite` em `limiteRequisicoes.js`). Para um TCC sem Redis, cache em memória é suficiente. Em produção multi-processo seria necessário Redis, mas isso está fora do escopo.

**Alternativa rejeitada**: Redis/django-ratelimit com Redis — dependência extra desnecessária para o escopo do TCC.

### D7 — SELECT FOR UPDATE via transaction.atomic + select_for_update()

**Decisão**: usar `django.db.transaction.atomic()` como context manager com `Model.objects.select_for_update().get(...)` nas views de entrada e retirada.

**Razão**: API nativa do Django ORM; legível, auditável, sem SQL bruto extra. O lock de linha (`FOR UPDATE`) garante que a verificação de estoque e o UPDATE ocorrem atomicamente, eliminando a race condition presente no backend Node.

```python
# Padrão de implementação
with transaction.atomic():
    product = Product.objects.select_for_update().get(id=pk, tenant_id=tenant_id)
    if product.quantidade < quantidade:
        return Response({"message": "Estoque insuficiente..."}, status=400)
    product.quantidade -= quantidade
    product.save()
    Movement.objects.create(...)
```

### D8 — Testes de contrato sem servidor Node rodando

**Decisão**: os testes de contrato comparam o comportamento do backend Django com o comportamento **documentado** (specs e código Node lido como referência), não fazendo chamadas ao servidor Node em tempo de execução.

**Razão**: exigir o Node rodando para os testes adicionaria complexidade de CI. Os testes de contrato são parametrizados com os payloads e as respostas esperadas derivados do código Node existente, garantindo paridade sem dependência de runtime.

**Alternativa rejeitada**: rodar ambos os backends e comparar respostas em tempo real — válida para paridade de produção, mas fora do escopo dos testes automatizados do TCC.

## Risks / Trade-offs

| Risco | Mitigação |
|---|---|
| ORM Django gera query diferente do SQL Node para relatórios analíticos, retornando campos em ordem ou tipos diferentes | Usar SQL bruto nas 5 queries do `reportController.js`; testes de contrato verificam campos e tipos |
| `bcrypt` Python tem API levemente diferente do npm (`checkpw` vs `compare`) — erro silencioso se mal mapeado | Teste de contrato específico: hash gerado pelo Node, verificado pelo Python |
| `managed = False` exige que os models reflitam o schema atual com precisão; campos divergentes causam erros em runtime | Mapear todos os campos do schema documentado em `Banco de dados.md` e validar com `manage.py check` antes de qualquer requisição |
| django-ratelimit em memória perde contadores em reinicialização do processo | Aceitável para TCC; documentar como limitação no README |
| O frontend usa `sessionStorage` para o JWT; se o domínio/porta mudar na troca de backend, as sessões abertas expiram | Aviso na documentação de deploy; sessões duram 8h e os usuários precisam fazer login novamente |
| Parsing NF-e com defusedxml pode rejeitar XMLs com namespace que o xml2js aceitava com `stripPrefix` | Testar com o mesmo XML de exemplo usado no frontend; ajustar parser se necessário |

## Migration Plan

1. Criar branch `feature/django-backend` a partir de `main`.
2. Implementar `backend-django/` na branch sem tocar em `backend/`.
3. Rodar pytest e testes de contrato contra o banco de dev.
4. Comparar manualmente respostas lado a lado (Node vs. Django) para cada endpoint crítico.
5. Atualizar `VITE_API_URL` para apontar para `backend-django` (porta diferente, ex. 3002) e testar o frontend.
6. Com paridade confirmada: abrir PR, fazer merge, desligar o servidor Node, atualizar README e `.env.example`.

**Rollback**: enquanto o branch não fizer merge, basta manter `VITE_API_URL` apontando para `backend/` (porta 3001). Após o merge, reverter a variável de ambiente.

## Open Questions

1. **Porta de desenvolvimento simultâneo**: ao testar paridade, o Django pode rodar na porta 3002 e o Node na 3001, apontando o frontend para cada um separadamente. Confirmar se há conflito com `VITE_API_URL` no `.env` local.
2. **Banco de teste para pytest**: usar banco Supabase de dev com dados de teste, ou configurar `TEST_DATABASE_URL` separado? A decisão afeta o tempo de setup mas não a lógica dos testes — pode ser resolvida no início da implementação.
3. **Cargo do criador no `createUser`**: o backend Node usa `nome.trim()` como `nome_empresa` para contas de equipe (linha 46 de `userController.js`). Confirmar se isso é intencional ou um bug conhecido antes de replicar.
