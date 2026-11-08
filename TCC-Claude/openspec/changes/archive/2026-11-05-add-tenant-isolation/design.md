# Design

## Context

Todas as tabelas (`usuarios`, `products`, `movements`) não possuem isolamento por empresa. O sistema usa um banco compartilhado sem qualquer coluna de escopo. Adicionar `tenant_id INTEGER` a cada tabela é a mudança mínima que resolve o problema sem alterar o schema de autenticação existente.

## Goals / Non-Goals

**Goals:**
- Isolar completamente dados entre empresas via `tenant_id`
- Cadastro público cria tenant novo; painel de equipe herda tenant do admin
- Dados existentes do usuário Lucas (id=2) ficam corretamente migrados

**Non-Goals:**
- Interface para o usuário gerenciar tenants
- Mover usuário entre tenants
- Relatórios cross-tenant

## Decisions

### `tenant_id` como coluna direta (sem tabela separada)

Adicionar `tenant_id INTEGER` nas tabelas `usuarios`, `products` e `movements`. O dono do tenant é identificado por `tenant_id = id` na tabela `usuarios`. Sem tabela `tenants` separada — simples, sem JOIN extra, e suficiente para o caso de uso.

**Alternativa descartada — tabela `tenants`**: Mais limpa em teoria, mas adiciona migração mais complexa e JOINs sem benefício prático no escopo atual.

### `tenant_id` no JWT e no middleware

O login inclui `tenant_id` no payload JWT. O middleware carrega `tenant_id` da query ao banco (já faz SELECT para validar `ativo`) e o expõe em `req.user.tenant_id`. Isso evita que um token antigo (sem `tenant_id`) quebre tudo — se o campo vier nulo do banco, o middleware pode rejeitar com 401.

### Migration: dados existentes

- `usuarios` com `role = 'admin'` e sem `tenant_id` → `UPDATE usuarios SET tenant_id = id WHERE tenant_id IS NULL AND role = 'admin'`
- `usuarios` com `role != 'admin'` (criados via painel) → devem herdar o tenant do admin. Dado o banco atual, `funcionario` (id=8) herda de Lucas (id=2). Migration: `UPDATE usuarios SET tenant_id = 2 WHERE tenant_id IS NULL`
- `products` e `movements` existentes → todos pertencem a Lucas (tenant 2): `UPDATE products SET tenant_id = 2 WHERE tenant_id IS NULL; UPDATE movements SET tenant_id = 2 WHERE tenant_id IS NULL`

### logMovement recebe tenant_id

`movementService.logMovement` passa a aceitar `tenant_id` como parâmetro e o insere na linha de movement. Todos os callers passam `req.user.tenant_id`.

## Risks / Trade-offs

- **[Risco] Tokens JWT emitidos antes da migration**: Tokens antigos não têm `tenant_id`. O middleware faz SELECT de qualquer forma e carrega do banco — tokens antigos ainda funcionam desde que o banco já tenha o `tenant_id` do usuário.
- **[Risco] Products/movements sem `tenant_id` após migration**: Se a migration não cobrir todos os registros, queries com `WHERE tenant_id = X` não vão retornar esses registros. A migration usa `IS NULL` para ser idempotente e cobrir todos.
