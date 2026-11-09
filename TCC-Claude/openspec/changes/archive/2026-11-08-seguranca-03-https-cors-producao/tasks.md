# Tasks

## 1. api/apps.py — system check de produção

- [x] 1.1 Adicionar `ready()` em `ApiConfig` que registra `check_producao_configs`.
- [x] 1.2 `check_producao_configs`: quando `DJANGO_ENV=production`:
  - `Error` se `ALLOWED_HOSTS` env var vazia (id `stockflow.E001`)
  - `Error` se `ALLOWED_ORIGINS` env var vazia (id `stockflow.E002`)
  - Retorna `[]` fora de produção (dev não é afetado)

## 2. settings.py — DJANGO_ENV=production força DEBUG=False

- [x] 2.1 Após a linha de `DEBUG = ...`, adicionar:
  `if os.environ.get('DJANGO_ENV') == 'production': DEBUG = False`

## 3. .env.example

- [x] 3.1 Adicionar `DJANGO_ENV=development` com comentário explicando os valores
  aceitos e o efeito de cada um.

## 4. Testes

- [x] 4.1 Criar `api/tests/test_config_producao.py`.
- [x] 4.2 `test_producao_sem_allowed_hosts_retorna_erro`: monkeypatch env, chama
  `check_producao_configs(None)`, verifica id `stockflow.E001`.
- [x] 4.3 `test_producao_sem_allowed_origins_retorna_erro`: id `stockflow.E002`.
- [x] 4.4 `test_producao_com_tudo_definido_sem_erros`: env com ambas → 0 erros.
- [x] 4.5 `test_fora_de_producao_sem_erros`: sem `DJANGO_ENV=production` → 0 erros.

## 5. Verificação

- [x] 5.1 `python -m pytest api/tests/test_config_producao.py -v` — 0 falhas.
- [x] 5.2 Suite completa — 0 falhas.
- [ ] 5.3 (manual) `DJANGO_ENV=production ALLOWED_HOSTS=... ALLOWED_ORIGINS=... DJANGO_SECRET_KEY=... python manage.py check --deploy`
  Avisos esperados e justificados:
  - `security.W006` (HSTS preload): não ativado intencionalmente — requer registro deliberado no preload-list.
  - `security.W009` (SECRET_KEY): em produção a chave DEVE ser trocada pelo usuário. Não há como testar automaticamente.

## 6. Frontend (confirmação)

- [x] 6.1 `api.js` usa `import.meta.env.VITE_API_URL || ''` — sem localhost fixo. ✓
  `vite.config.js` tem proxy para dev apenas (não compilado em build). ✓
