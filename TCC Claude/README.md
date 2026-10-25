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

## Frontend

```bash
cd frontend
npm install
npm run dev   # https://localhost:5173 — proxy /api → http://localhost:3002
```
