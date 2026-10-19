# Tasks

## 1. Pré-checagem de segurança

- [ ] 1.1 Confirmar com o usuário que o repositório `Pansera13/TCC` no GitHub está **privado**. Verificar pela resposta explícita do usuário antes de seguir.

## 2. Ajustar o .gitignore

- [x] 2.1 Remover as linhas `.env`, `frontend/.env` e `backend/.env` do `.gitignore` da raiz, mantendo `node_modules/` e `dist/`. Verificar com `git check-ignore -v frontend/.env backend/.env`, que não deve retornar nada.
- [x] 2.2 Confirmar que os valores em `frontend/.env` são reais e não os placeholders `COLE-AQUI`. Verificar com `grep COLE-AQUI frontend/.env`, que não deve retornar nada. Se houver placeholder, pedir ao usuário os valores do Supabase.

## 3. Versionar e enviar

- [x] 3.1 Rodar `git add .gitignore frontend/.env backend/.env` e verificar que `git status` mostra os três arquivos como staged.
- [x] 3.2 Criar commit e verificar que `git ls-files frontend/.env backend/.env` lista os dois arquivos.
- [ ] 3.3 Fazer `git push origin main`, somente com autorização explícita do usuário, e verificar que os arquivos aparecem no GitHub.
