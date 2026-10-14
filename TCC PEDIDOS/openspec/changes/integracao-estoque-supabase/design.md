# Design

## Context

Ver `proposal.md` para motivação. Estado atual: `estoqueService.js` usa `axios` para chamar o backend do TCC Claude via HTTP; `auth.js` instancia um cliente Supabase por requisição; `server.js` usa porta 3001 com aviso de `ESTOQUE_SERVICE_TOKEN`; a rota `PATCH /pedidos/:id/pagar` marca o pedido como `pago` antes de tentar baixar o estoque. A migração `002_estoque_integracao.sql` (pré-requisito) criou as tabelas do estoque no Supabase e a função `pagar_pedido`.

## Goals / Non-Goals

**Goals:**
- Substituir toda comunicação HTTP com o TCC Claude por operações diretas no Supabase.
- Garantir atomicidade no pagamento via `pagar_pedido` (função SQL `SECURITY DEFINER`).
- Corrigir o comportamento de pagamento: só marca `pago` quando todo estoque está disponível.
- Simplificar o backend: sem `axios`, sem token de serviço, sem lógica de retry.

**Non-Goals:**
- Migrar o banco MySQL do TCC Claude (continua existindo; o Supabase é adicionado em paralelo).
- Alterar qualquer código do TCC Claude.
- Tratar reprocessamento automático de pagamentos com falha.

## Decisions

### 1. `pagar_pedido` como única operação de pagamento

A função SQL já implementa lock de linha (`FOR UPDATE` com ordem fixa por `product_id`), validação de estoque, decremento atômico e registro de movimentação em uma única transação. O backend chama `supabase.rpc('pagar_pedido', { p_pedido_id, p_user_id })` e mapeia o JSON de retorno para o status HTTP — nenhuma lógica de negócio de estoque fica no Node.js.

**Alternativa considerada**: Manter a lógica no Node.js com múltiplos `UPDATE` Supabase — descartado por não ser atômico e não prevenir race conditions.

**Mapeamento de códigos de retorno da RPC:**

| `codigo` | HTTP | Situação |
|---|---|---|
| `nao_encontrado` | 404 | Pedido não existe |
| `acesso_negado` | 403 | Pedido de outro usuário |
| `status_invalido` | 400 | Pedido não está em `confirmado` |
| `estoque_insuficiente` | 409 | Um ou mais itens sem saldo; nada foi baixado |
| *(ok: true)* | 200 | Pedido pago, estoque baixado |

### 2. Cliente Supabase compartilhado em `supabase.js`

`auth.js` importa o client de `../supabase` em vez de instanciar um `createClient` por requisição. Isso evita a criação de dezenas de clientes por segundo e centraliza a configuração.

**Alternativa considerada**: Manter `createClient` por requisição — descartado por custo desnecessário e por expor `SUPABASE_SERVICE_KEY` em múltiplos pontos.

### 3. Remoção de `axios`

Com o HTTP para o TCC Claude eliminado, `axios` não tem mais uso. Remover a dependência reduz a superfície e o tamanho do bundle.

### 4. Frontend — porta 5174 e limite de quantidade

O Vite do TCC Claude usa a porta 5173 (padrão). Fixar 5174 em `vite.config.js` evita conflito ao rodar os dois em paralelo. O `NovoPedido.jsx` usa o campo `max` do `<input type="number">` com o valor de `produto.quantidade` para impedir que o usuário selecione mais do que o disponível — primeira linha de defesa antes da validação no banco.

### 5. `.gitignore` nos dois projetos

Os arquivos `.env` contêm `SUPABASE_SERVICE_KEY` (credencial com acesso irrestrito ao banco). Garantir que `backend/.gitignore` e `frontend/.gitignore` excluam `.env` antes de qualquer commit.

## Risks / Trade-offs

- **`pagar_pedido` usa `SECURITY DEFINER`**: corre com os privilégios de quem criou a função (superuser do Supabase). Uma vulnerabilidade na função teria impacto alto. → Mitigation: a função só pode ser executada pelo `service_role` (REVOKE foi aplicado na migração); o service_role key nunca sai do backend.
- **TCC Claude com dois bancos em paralelo**: enquanto o TCC Claude ainda usa MySQL localmente e o Supabase é adicionado, as quantidades podem divergir se o operador usar os dois sistemas ao mesmo tempo. → Mitigation: aceito para TCC; em produção, o MySQL seria migrado ou desativado.
- **Sem retry automático em 409**: se um pedido ficar preso em `confirmado` por falta de estoque, o operador precisa resolver manualmente e tentar pagar novamente. → Mitigation: o frontend mantém o botão "Marcar como Pago" visível e exibe os itens problemáticos após o 409.

## Migration Plan

1. Garantir que `002_estoque_integracao.sql` foi executado no Supabase (pré-requisito).
2. Criar `backend/.env` e `frontend/.env` a partir dos `.env.example` atualizados.
3. Verificar conexão: `npm run test-supabase` no backend.
4. Subir o backend (`node src/server.js`) e confirmar `GET /health` e `GET /estoque/produtos`.
5. Subir o frontend (`npm run dev` → porta 5174).
6. Testar o fluxo completo: criar pedido → confirmar → pagar → conferir `movements` no Supabase.

**Rollback**: restaurar `estoqueService.js` e `routes/pedidos.js` anteriores, recolocar `ESTOQUE_API_URL`/`ESTOQUE_SERVICE_TOKEN` no `.env`, reiniciar o backend.
