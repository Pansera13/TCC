# Design

## Context

Ver `proposal.md` para motivação. O sistema de estoque (TCC Claude) já existe com backend Node.js/Express + MySQL, expondo rotas `GET /products` e `POST /products/:id/withdraw` protegidas por JWT. O TCC PEDIDOS é um projeto do zero que precisa de banco de dados próprio, autenticação própria e comunicação com essa API.

## Goals / Non-Goals

**Goals:**
- Sistema de pedidos completamente separado: repositório, banco de dados e auth próprios.
- Supabase como banco de dados e provedor de auth do TCC PEDIDOS.
- Comunicação com o TCC Claude via chamada HTTP server-to-server (backend → backend).
- Registrar falhas de baixa sem travar o fluxo de pagamento.

**Non-Goals:**
- Modificar qualquer código do TCC Claude.
- Sincronização bidirecional de dados (pedidos não são visíveis no sistema de estoque).
- Reprocessamento automático de baixas com falha (registra para tratamento manual).
- Relatórios financeiros ou fluxo de caixa.

## Decisions

### 1. Supabase como banco + auth (em vez de MySQL + JWT próprio)

O TCC PEDIDOS usa Supabase (PostgreSQL gerenciado + Supabase Auth) para o banco de dados e autenticação. O sistema de estoque já usa MySQL — compartilhar o banco exigiria migração do TCC Claude, que está fora do escopo.

**Alternativa considerada**: Criar outro banco MySQL e implementar JWT do zero — descartado porque duplicaria infraestrutura sem benefício e aumentaria o trabalho de autenticação.

**Tabelas no Supabase**:
```
pedidos (id, user_id, status, created_at, updated_at)
itens_pedido (id, pedido_id, product_id, product_nome, quantidade, unidade)
```
Row Level Security (RLS) no Supabase garante que cada usuário vê apenas seus pedidos.

### 2. Comunicação via API REST server-to-server

Quando um pedido é marcado como pago, o backend do TCC PEDIDOS chama `POST /products/:id/withdraw` no TCC Claude com um token de serviço (variável de ambiente `ESTOQUE_API_URL` + `ESTOQUE_SERVICE_TOKEN`). A chamada é feita no backend para não expor o token no frontend.

**Alternativa considerada**: Chamar diretamente do frontend — descartado por expor o token de serviço no navegador.

**Alternativa considerada**: Webhook Supabase → TCC Claude — descartado por exigir que o TCC Claude expusesse um endpoint de webhook e gerenciasse segredo adicional.

### 3. Pedido permanece `pago` mesmo com falha de baixa

Se a chamada ao estoque falhar (timeout, 400, 500), o pedido fica `pago` e o erro é registrado no campo `estoque_erros` (JSONB) em `pedidos`. Operadores podem consultar pedidos pagos com `estoque_erros` não-nulo para retentativa manual.

**Alternativa considerada**: Reverter para `confirmado` ao falhar — descartado porque o pagamento já ocorreu e reverter criaria inconsistência financeira.

### 4. Stack do TCC PEDIDOS: React + Vite (frontend) + Node.js/Express (backend)

Mesma stack do TCC Claude para consistência do TCC e facilidade de manutenção pelo mesmo desenvolvedor.

**Backend**: Express + `@supabase/supabase-js` + `axios` (para chamar TCC Claude).  
**Frontend**: React + Vite + `@supabase/supabase-js` (para auth e operações de leitura diretas).

## Risks / Trade-offs

- **Dependência de rede em tempo de pagamento**: A baixa de estoque depende que o TCC Claude esteja online. Se estiver fora, a baixa falha mas o pedido é salvo como pago. → Mitigation: campo `estoque_erros` + instrução operacional para retentativa manual.
- **Sem transação atômica entre sistemas**: O Supabase atualiza o status para `pago` e depois chama o MySQL do TCC Claude — se o processo crashar entre essas duas etapas, o estoque não baixa. → Mitigation: campo `estoque_erros` permite identificar e corrigir manualmente; aceitável no contexto de TCC.
- **Token de serviço estático**: Um único `ESTOQUE_SERVICE_TOKEN` para autenticar o TCC PEDIDOS no TCC Claude. Rotação exige atualização de env vars em ambos os serviços. → Mitigation: aceitável para TCC; em produção, usar credenciais rotativas.

## Migration Plan

1. Criar projeto Supabase dedicado ao TCC PEDIDOS (via console Supabase).
2. Executar script de criação das tabelas `pedidos` e `itens_pedido` e configurar RLS.
3. Configurar variável `ESTOQUE_SERVICE_TOKEN` no TCC Claude (rota de withdraw deve aceitar o token).
4. Subir backend do TCC PEDIDOS com envs `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `ESTOQUE_API_URL`, `ESTOQUE_SERVICE_TOKEN`.
5. Subir frontend do TCC PEDIDOS com envs `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`.

## Open Questions

- O TCC Claude precisa aceitar autenticação por token de serviço além do JWT de usuário na rota `/products/:id/withdraw`, ou será adicionado um novo endpoint dedicado? (Impacta o middleware de auth do TCC Claude — verificar com o implementador antes de codificar a integração.)
