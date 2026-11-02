# Design

## Context

- O `.gitignore` da raiz tem `node_modules/`, `.env`, `frontend/.env`, `backend/.env` e `dist/`.
- O `frontend/.gitignore` (template do Vite) não ignora `.env` (só `*.local`), então só a regra da raiz bloqueia `frontend/.env`.
- Nenhum `.env` real está rastreado hoje. Só `backend/.env.example` e `backend/.env.example.supabase` estão no git.
- Motivação: ver proposal.md, seção Why.

## Goals / Non-Goals

**Goals:**
- `frontend/.env` e `backend/.env` passam a ser rastreados e chegam ao GitHub.
- Clonar ou dar `git pull` em outra máquina deixa o projeto pronto para rodar, sem copiar `.env` manualmente.

**Non-Goals:**
- Serviço de gestão de segredos (Doppler, GitHub Secrets, Supabase Vault).
- Trocar os valores atuais dos segredos.
- Alterar `node_modules/` e `dist/`, que continuam ignorados.

## Decisions

- **Remover as três linhas `.env` do `.gitignore` da raiz**, em vez de usar `git add -f`. Com `-f`, o arquivo passa a ser rastreado, mas a regra no `.gitignore` continua lá e confunde quem ler. Remover deixa a intenção explícita.
- **Não adicionar regras de `!negação`**, porque não sobra nenhuma regra que precise ser anulada.
- **Manter os `.env.example`** como documentação das variáveis esperadas.

## Risks / Trade-offs

- [Segredos do backend expostos se o repo for público ou ficar público] → Confirmar no GitHub (Settings → General → Danger Zone) que `Pansera13/TCC` é **privado** antes do push. Não tornar o repo público sem antes trocar `JWT_SECRET`, `JWT_RESET_SECRET`, a senha do banco no Supabase e `EMAIL_PASS`, porque o histórico do git guarda os valores antigos.
- [Colaboradores ou avaliadores com acesso ao repo verão os segredos] → Aceito pelo usuário. Para revogar, basta rotacionar os segredos acima.
- [A `VITE_SUPABASE_ANON_KEY` já é pública por natureza (vai no bundle do frontend)] → A segurança depende do RLS no Supabase, não de esconder a chave.
