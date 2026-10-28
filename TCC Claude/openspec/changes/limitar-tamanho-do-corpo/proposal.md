# Proposal

## Why

O backend não tem limite explícito de tamanho de requisição: qualquer cliente pode enviar um corpo de vários megabytes a qualquer endpoint, forçando o Django a ler tudo em memória antes da primeira linha de view executar — vetor de DoS simples e barato. A NF-e tem uma verificação de tamanho, mas ela lê `request.body` completo antes de checar o tamanho na rota sem arquivo, negando o propósito da defesa.

## What Changes

- `settings.py`: adiciona `DATA_UPLOAD_MAX_MEMORY_SIZE` (64 KB), `FILE_UPLOAD_MAX_MEMORY_SIZE` (2 MB) e `DATA_UPLOAD_MAX_NUMBER_FIELDS` (200), todos configuráveis por variável de ambiente.
- `api/middleware.py`: novo `RequestSizeLimitMiddleware` que verifica o cabeçalho `Content-Length` por rota antes que qualquer view leia o corpo; converte `RequestDataTooBig` e `TooManyFieldsSent` em JSON 413 padronizado.
- `api/views/nfe.py`: muda respostas de tamanho de 400 → 413, adota o formato padronizado `{"message": "...", "limite_bytes": <n>}`; remove a leitura desnecessária do corpo antes da checagem.
- `.env.example`: documenta as novas variáveis.
- `README.md`: nota sobre limite no proxy/servidor de produção.

## Capabilities

### New Capabilities

- `backend/request-size-limits`: limitar o tamanho do corpo de requisições HTTP antes da leitura, com resposta 413 JSON, por rota, com tratamento de exceções de parsing do Django.

### Modified Capabilities

- `products/nfe-scan`: a verificação de tamanho passa a retornar 413 (não 400), com o formato `{"message": "Requisição muito grande.", "limite_bytes": <n>}`; a rota sem arquivo deixa de ler `request.body` antes de checar o tamanho (pré-verificação via middleware).
- `backend/django-runtime`: HTTP 413 passa a fazer parte do conjunto de respostas de erro em JSON (`{"message": "..."}`) emitidas pelo backend.

## Impact

- `backend-django/stockflow/settings.py` — 3 novas configurações
- `backend-django/api/middleware.py` — nova classe de middleware
- `backend-django/stockflow/settings.py` MIDDLEWARE — nova entrada na pilha
- `backend-django/api/views/nfe.py` — status code e formato da resposta de tamanho
- `backend-django/.env.example` — novas variáveis documentadas
- `README.md` — nota sobre proxy de produção
- Sem mudança em banco, endpoints ou formato de resposta não-413
