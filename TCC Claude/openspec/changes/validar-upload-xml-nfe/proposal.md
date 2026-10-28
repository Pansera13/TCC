# Proposal

## Why

A rota `/api/nfe/xml` valida apenas o tamanho (com um bug: lê `request.body` inteiro antes de checar) e a estrutura XML. Chamadas diretas à API podem enviar qualquer tipo de arquivo (a validação de `.xml` existe só no frontend), e não há rate limit, auditoria nem proteção contra conteúdo binário ou XML estruturalmente abusivo. Um atacante autenticado pode enviar binários grandes ou XMLs com entidades maliciosas.

## What Changes

- `api/views/nfe.py`: adiciona validação em camadas — rate limit, tamanho correto (413), extensão e nome seguro (415), Content-Type (415), sniff de conteúdo (415), captura de exceções do defusedxml (400), limite de itens `<det>` (422), log de auditoria — sem alterar o formato de sucesso.
- `stockflow/settings.py`: adiciona `NFE_MAX_ITENS` (padrão 500) configurável por variável de ambiente.
- `api/limites.py`: reutilizado; nenhuma alteração no módulo.
- `frontend/src/components/AddProductModal.jsx`: pequena adição para exibir o `retry_after` em caso de 429 e normalizar o tratamento de todos os novos códigos de erro.
- `.env.example`: documenta `NFE_MAX_ITENS`.

## Capabilities

### New Capabilities

*(nenhuma — todas as mudanças são extensões de capabilities existentes)*

### Modified Capabilities

- `products/nfe-scan`: validação em camadas no backend (tamanho, extensão/nome, Content-Type, sniff, exceções defusedxml, limite de itens, rate limit, auditoria); os limites e o formato de resposta do `products/nfe-scan` são definidos nesta spec.
- `frontend/add-modal`: exibir mensagens de erro 413/415/422 do backend e countdown para 429.
- `backend/django-runtime`: HTTP 413, 415 e 422 adicionados ao conjunto de respostas de erro JSON.

## Impact

- `backend-django/api/views/nfe.py` — reescrita da função `parse_nfe` com novas camadas de validação
- `backend-django/stockflow/settings.py` — nova variável `NFE_MAX_ITENS`
- `backend-django/.env.example` — documenta `NFE_MAX_ITENS`
- `frontend/src/components/AddProductModal.jsx` — tratamento de 429 com retry_after
- `README.md` — nota sobre NFE_MAX_ITENS (opcional)
- Sem mudança em banco, endpoints ou formato de sucesso `{produtos, chNFe}`
