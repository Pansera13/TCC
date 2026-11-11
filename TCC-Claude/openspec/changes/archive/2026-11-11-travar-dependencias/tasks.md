# Tasks

## 1. Remover pacotes não usados e limpar settings

- [x] 1.1 Grep em `api/` por `rest_framework` e `django_ratelimit` para confirmar que nenhum arquivo os importa; registrar resultado na PR/apply.
- [x] 1.2 Remover `'rest_framework'` de `INSTALLED_APPS` em `settings.py`; verificar que `python manage.py check` passa sem erro.
- [x] 1.3 Remover bloco `REST_FRAMEWORK` (linhas 130–135) e `RATELIMIT_USE_CACHE` (linha 157) e o comentário associado de `settings.py`; manter bloco `CACHES`; verificar que `python manage.py check` passa.
- [x] 1.4 Remover `djangorestframework>=3.15` e `django-ratelimit>=4.1` de `requirements.txt`; confirmar que `pip install -r requirements.txt` em ambiente limpo não instala esses pacotes.

## 2. Criar requirements.in e gerar requirements.txt com versões fixas

- [x] 2.1 Pedir autorização ao Lucas para instalar `pip-tools` (`pip install pip-tools`); aguardar OK.
- [x] 2.2 Criar `backend-django/requirements.in` com as 7 dependências de runtime diretas, sem operador `>=`: `django`, `psycopg2-binary`, `PyJWT`, `bcrypt`, `requests`, `defusedxml`, `python-dotenv`.
- [x] 2.3 Rodar `pip-compile requirements.in -o requirements.txt` no diretório `backend-django/`; verificar que o arquivo gerado usa `==` em todas as linhas e não contém `djangorestframework` nem `django-ratelimit`.
- [x] 2.4 Criar `backend-django/requirements-dev.txt` com `pytest-django>=4.9`, `pytest-cov>=6.0`, `bandit>=1.7`, `pip-audit>=2.7`; verificar que `pip install -r requirements-dev.txt` instala as 4 ferramentas.
- [x] 2.5 Rodar `pip-audit -r requirements.txt`; verificar que termina com código 0 (sem vulnerabilidades conhecidas).

## 3. Remover assets Vite sem referência

- [x] 3.1 Grep em `frontend/src` e `frontend/public` por `hero.png`, `react.svg`, `vite.svg` e `icons.svg` para confirmar ausência de referências; registrar resultado.
- [x] 3.2 Deletar `frontend/src/assets/hero.png`, `frontend/src/assets/react.svg`, `frontend/src/assets/vite.svg` e `frontend/public/icons.svg`; verificar que `npm run build` continua passando.
- [x] 3.3 Rodar `npm audit --audit-level=high` no diretório `frontend/`; verificar código de saída 0.

## 4. Configurar Dependabot

- [x] 4.1 Criar `.github/dependabot.yml` na raiz do repositório com ecosistema `pip` em `/TCC-Claude/backend-django` e `npm` em `/TCC-Claude/frontend`, intervalo semanal; verificar que o YAML é válido com `python -c "import yaml; yaml.safe_load(open('.github/dependabot.yml'))"`.
- [x] 4.2 Propor ao Lucas a linha `!/.github/` no `.gitignore` da raiz (após `!/TCC-Claude/`); aguardar confirmação antes de editar o arquivo.
- [x] 4.3 Após confirmação do Lucas, adicionar `!/.github/` ao `.gitignore`; verificar com `git check-ignore -v .github/dependabot.yml` que o arquivo NÃO é mais ignorado.

## 5. Verificação final

- [x] 5.1 Avisar Lucas e aguardar autorização; rodar `python -m pytest` completo; confirmar 0 falhas e ausência de dados de teste no Supabase.
- [x] 5.2 Rodar `npm run build` no diretório `frontend/`; confirmar build sem erros ou avisos novos.

## Workflow follow-up

- Arquivar a change após os testes passarem e Lucas aprovar.
- Passar ao Bloco 2 (`analise-estatica-seguranca`) somente após arquivamento.
