# StockFlow — TCC UNIMATER

Sistema de controle de estoque multi-tenant com backend Python/Django e frontend React.

## Estrutura

```
backend-django/   Python 3 + Django 6 + Django REST Framework
frontend/         React + Vite + Tailwind
openspec/         Artefatos de especificação (spec-driven development)
```

## Backend Django

### Pré-requisitos

- Python 3.11+
- Conta no Supabase com as tabelas já criadas (ver vault: `Banco de dados.md`)

### Setup

```bash
cd backend-django

# 1. Ambiente virtual
python -m venv venv
venv\Scripts\activate        # Windows
# ou: source venv/bin/activate  # Linux/Mac

# 2. Dependências
pip install -r requirements.txt

# 3. Variáveis de ambiente
cp .env.example .env
# Edite .env com DATABASE_URL, JWT_SECRET e RESEND_API_KEY reais

# 4. Verificar conexão (não altera tabelas — todos os modelos têm managed=False)
python manage.py migrate --run-syncdb

# 5. Subir servidor
python manage.py runserver 3002
```

A API estará disponível em `http://localhost:3002/api/`.

### Testes

```bash
# Todos os testes (requer DATABASE_URL no .env)
python -m pytest

# Com relatório de cobertura
python -m pytest --cov=api --cov-report=term-missing

# Apenas testes de permissões (sem banco)
python -m pytest api/tests/test_permissions.py
```

### Variáveis de ambiente

Ver `backend-django/.env.example` para a lista completa com descrições.

Variáveis principais:

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | — | URL PostgreSQL (Supabase) |
| `JWT_SECRET` | — | Segredo para tokens JWT |
| `RESEND_API_KEY` | — | Chave da API de e-mail |
| `LOGIN_MAX_FALHAS` | `5` | Falhas de login antes do bloqueio (por IP e por identificador) |
| `LOGIN_JANELA_SEGUNDOS` | `900` | Janela de contagem das falhas (15 min) |
| `LOGIN_BLOQUEIO_SEGUNDOS` | `900` | Duração do bloqueio após exceder o limite (15 min) |
| `REGISTER_MAX_FALHAS` | `10` | Tentativas de cadastro por IP antes do bloqueio |
| `REGISTER_JANELA_SEGUNDOS` | `3600` | Janela de contagem para cadastro (1 hora) |
| `REGISTER_BLOQUEIO_SEGUNDOS` | `3600` | Duração do bloqueio de cadastro (1 hora) |
| `TRUSTED_PROXY` | `false` | Se `true`, usa `X-Forwarded-For` como IP do cliente. **Ativar somente com proxy reverso confiável (nginx, Cloudflare, etc.) na frente do servidor** — sem ele, qualquer cliente pode forjar o cabeçalho e burlar o rate limit por IP. |

> **Cache em produção:** em desenvolvimento o rate limit usa `LocMemCache` (memória do processo). Em produção com múltiplos workers, configure um cache compartilhado (ex.: Redis via `django-redis`) para que os contadores sejam globais.

### Variáveis de segurança (cabeçalhos)

| Variável | Padrão | Descrição |
|---|---|---|
| `DEBUG` | `false` | `true` somente em desenvolvimento local |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1` | Hosts aceitos (separados por vírgula); em produção, o domínio real |
| `SECURE_HSTS_SECONDS` | `300` | Duração do HSTS em segundos (só ativo com `DEBUG=false`); subida gradual: 300 → 3600 → 86400 → 31536000 |

## Frontend

```bash
cd frontend
npm install
npm run dev   # https://localhost:5173 — proxy /api → http://localhost:3002
```

### Cabeçalhos de segurança do frontend

O servidor de hospedagem do build React (Netlify, Vercel, nginx, etc.) deve enviar os seguintes cabeçalhos em todas as respostas HTML:

| Cabeçalho | Valor recomendado |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy-Report-Only` | `default-src 'self'; ...` (iniciar em modo relatório antes de enforçar) |

Ao enforçar a CSP, as seguintes diretivas precisam de ajuste para o StockFlow funcionar:

- `frame-src https://www.google.com/recaptcha/` — necessário para o widget reCAPTCHA v2
- `connect-src <URL-Supabase>` — necessário para queries em tempo real do Supabase
- `camera` e `microphone` em `Permissions-Policy` devem ser permitidos na origem do frontend se o leitor de código de barras via câmera for ativado (a API bloqueia esses recursos por padrão — isso se aplica apenas às respostas da API, não ao documento HTML do frontend)
