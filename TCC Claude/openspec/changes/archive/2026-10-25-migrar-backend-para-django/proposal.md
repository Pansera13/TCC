# Proposal

## Why

A proposta de TCC aprovada pela banca especifica "linguagem Python com um framework web, como Django, e PostgreSQL", mas o sistema StockFlow foi implementado em Node.js/Express — divergência que precisa ser resolvida antes da apresentação. A migração alinha o código à proposta, mantém o comportamento visível idêntico (nenhuma alteração funcional no frontend React) e fecha a lacuna de consistência nas movimentações de estoque (atualmente sem transação atômica), que é um dos objetivos centrais documentados na proposta.

## What Changes

- **Novo backend Python/Django/DRF** em `backend-django/` substituindo `backend/` (Node/Express), rodando na mesma porta 3001 ou variável de ambiente equivalente.
- **Mesmos 30+ endpoints**, mesmos métodos HTTP, mesmos códigos de status, mesmos campos de resposta — o frontend React não sofre nenhuma alteração funcional além da URL base da API (variável de ambiente).
- **ORM não-destrutivo**: tabelas `usuarios`, `products`, `movements`, `notificacoes` mapeadas com `managed = False`; nenhuma migration destrutiva é executada.
- **Compatibilidade bcrypt**: senhas existentes (hash bcrypt custo 12) continuam válidas via `bcrypt` (Python) sem migração de dados.
- **SELECT FOR UPDATE** nas operações de retirada e entrada de estoque, fechando a lacuna de saldo inconsistente sob concorrência.
- **BREAKING (infra)**: o serviço Node é desligado após paridade provada em branch separada; o banco não muda.
- **Suíte pytest-django** com um único comando de execução e testes de contrato comparando respostas do backend Django com o backend Node.
- **Métricas de migração** registradas em `03 - Metricas/Registro de metricas.md` conforme requerido pelo TCC.
- **README, `.env.example` e recursos tecnológicos** atualizados para refletir Python/Django/DRF.

## Capabilities

### New Capabilities

- `backend/django-runtime`: Stack Django + DRF, conexão psycopg2 ao Supabase/PostgreSQL, ORM não-destrutivo mapeando tabelas existentes, variáveis de ambiente, CORS, rate limit, handler de erro JSON padronizado, porta configurável, bcrypt compatível com hashes existentes e middleware JWT com releitura do banco a cada requisição.
- `products/stock-transaction`: Garantia de isolamento transacional nas operações de entrada e retirada de estoque usando SELECT FOR UPDATE, evitando saldo inconsistente sob requisições concorrentes. Nova behavioral requirement não coberta por nenhuma spec existente.
- `backend/contract-test-suite`: Suíte pytest-django executável com um único comando, incluindo testes de contrato que provam paridade de resposta entre backend Django e Node (mesmas requisições, mesmos campos, mesmos status HTTP).

### Modified Capabilities

- `products/stock-withdrawal`: Adiciona requisito de atomicidade — a retirada DEVE usar transação com lock de linha para garantir que o saldo não fique negativo sob concorrência, complementando a lógica de validação já especificada.
- `products/stock-entry`: Adiciona requisito equivalente para entrada — a operação DEVE ser atômica (SELECT FOR UPDATE) para preservar consistência sob concorrência, tornando o registro auditável dentro da mesma transação.

## Impact

- **Código novo**: `backend-django/` (projeto Django standalone, não substitui `backend/` até paridade provada).
- **Branch separada**: todo o desenvolvimento ocorre fora de `main`; o backend Node continua funcionando.
- **Banco (Supabase)**: zero alterações em tabelas, colunas, constraints ou funções (`pagar_pedido` intocada).
- **Frontend**: apenas a variável `VITE_API_URL` (ou equivalente) precisa apontar para o novo backend — sem alteração de código React.
- **Dependências Python novas**: Django, djangorestframework, psycopg2-binary, PyJWT, bcrypt, requests (Resend), defusedxml, django-ratelimit (ou similar), pytest-django.
- **CI/testes**: `npm test` no Node é substituído por `pytest` no Django; os testes de contrato rodam contra ambos os backends para validar paridade.
- **TCC**: matriz de rastreabilidade atualizada em `02 - Requisitos`; métricas em `03 - Metricas`.
