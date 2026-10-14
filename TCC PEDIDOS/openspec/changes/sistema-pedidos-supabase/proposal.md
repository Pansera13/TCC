# Proposal

## Why

O sistema de estoque (TCC Claude) possui somente entradas via leitura de código de barras / QR Code de NF-e, sem nenhum mecanismo de saída controlada. Clientes internos ou operadores precisam de uma forma de gerar pedidos e, ao confirmá-los como pagos, baixar automaticamente o estoque correspondente — eliminando retiradas manuais e inconsistências de quantidade.

## What Changes

- Criação de um novo sistema independente (TCC PEDIDOS) com frontend React + Vite e backend Node.js + Supabase (PostgreSQL).
- Interface para criar pedidos compostos de múltiplos itens referenciando produtos do sistema de estoque.
- Fluxo de status do pedido: `rascunho` → `confirmado` → `pago`.
- Ao marcar um pedido como **pago**, o sistema de pedidos chama a API REST do sistema de estoque para executar a baixa (`saída`) de cada item do pedido.
- Consulta de produtos do sistema de estoque via API REST para exibir disponibilidade em tempo real durante a montagem do pedido.
- Autenticação própria no sistema de pedidos via Supabase Auth.
- Listagem e histórico de pedidos por usuário.

## Capabilities

### New Capabilities

- `order-management`: Ciclo de vida completo de um pedido — criação, adição de itens, atualização de status e histórico. Persiste no Supabase do sistema de pedidos.
- `stock-integration`: Integração de saída com o sistema de estoque: consulta de produtos disponíveis via API REST e envio de baixa de estoque quando um pedido é marcado como pago.

### Modified Capabilities

*(nenhuma — sistemas separados, sem alteração de specs existentes)*

## Impact

- **Novo projeto TCC PEDIDOS**: backend Node.js (Express + Supabase JS client) e frontend React + Vite.
- **Sistema de estoque TCC Claude**: nenhuma alteração de código. Apenas requer que as rotas `GET /products` e `POST /products/:id/withdraw` estejam acessíveis com autenticação de serviço (token de serviço ou API key configurável por variável de ambiente).
- **Supabase**: novo projeto dedicado ao TCC PEDIDOS com tabelas `pedidos` e `itens_pedido`. Supabase Auth gerencia usuários do sistema de pedidos.
- **Dependência de rede**: o backend do TCC PEDIDOS precisa alcançar o backend do TCC Claude (URL configurável via env).
