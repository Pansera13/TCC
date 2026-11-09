# Tasks — Bloco 9 Segredos fora do Git

- [x] Diagnóstico: quais .env estão rastreados (nenhum no Django — apenas Node.js antigo no histórico)
- [x] Identificar commits com .env exposto: 5 commits (140d644, e0c45db, 5ef198e, aad3cd6, 7af87cb)
- [x] Verificar variáveis expostas: DB, JWT_SECRET, JWT_RESET_SECRET, RECAPTCHA_SECRET, Mailtrap
- [x] Confirmar que .gitignore atual cobre corretamente: .env e .env.* em qualquer subdir
- [x] Escrever plano de ação com rotação + git filter-repo + force-push
- [ ] Lucas: rotar JWT_SECRET e JWT_RESET_SECRET se reusados (veja plano_acao.md passo 1a)
- [ ] Lucas: rotar RECAPTCHA_SECRET, DATABASE_URL, RESEND_API_KEY (passo 1b-1d)
- [ ] Lucas: instalar git-filter-repo e confirmar com "sim" para executar (passo 2)
- [ ] Lucas: force-push após filter-repo (passo 3)
