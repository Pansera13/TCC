# Bloco 9 — Plano de Ação

## Passo 1 — Rotar credenciais PRIMEIRO (antes de qualquer push)

Antes de remover do histórico, rode as credenciais novas para que os segredos
antigos já não tenham mais valor, independente de alguém ter copiado o histórico.

### 1a. JWT_SECRET e JWT_RESET_SECRET (crítico se reusados)

Verificar se o valor no `.env` atual do Django é o mesmo que estava no Node.js antigo.
Se sim, gerar novos:

```bash
# Gerar novo JWT_SECRET (32 bytes = 256 bits, base64)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Gerar novo JWT_RESET_SECRET
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Atualizar nos arquivos `.env` de cada máquina (PC e notebook).

**Consequência da rotação:** todos os tokens JWT existentes ficam inválidos —
usuários logados precisarão fazer login novamente. Aceitável para TCC.

### 1b. RECAPTCHA_SECRET

Acesse: https://www.google.com/recaptcha/admin
→ Selecione o site → Configurações → Regenerar chave secreta.
Atualize o `.env` em cada máquina.

### 1c. DATABASE_URL / DB_PASS (Supabase)

No Supabase Dashboard → Settings → Database → Reset Database Password.
Atualize o `.env` em cada máquina.

### 1d. RESEND_API_KEY

Acesse: https://resend.com/api-keys
→ Exclua a chave antiga → Crie nova chave.
Atualize o `.env` em cada máquina.

---

## Passo 2 — Remover do histórico com git filter-repo

**Pré-requisito:** instalar `git-filter-repo`
```bash
pip install git-filter-repo
```

**Comando para remover os arquivos do histórico:**
```bash
# No diretório raiz do repositório (TCC-Claude)
git filter-repo --path "TCC Claude/backend/.env" --invert-paths
git filter-repo --path "TCC Claude/frontend/.env" --invert-paths
```

Ou em um único comando:
```bash
git filter-repo \
  --path "TCC Claude/backend/.env" \
  --path "TCC Claude/frontend/.env" \
  --invert-paths
```

Verificar que os arquivos não aparecem mais:
```bash
git log --all --oneline -- "TCC Claude/backend/.env"
# Deve retornar nada
```

---

## Passo 3 — Force-push para o GitHub

⚠️ **ATENÇÃO:** Isso reescreve o histórico público. Só fazer depois de confirmar
que ninguém mais trabalha neste repositório (é TCC individual).

```bash
git push origin --force --all
git push origin --force --tags
```

Após o push, o GitHub pode ainda mostrar os commits antigos no cache.
Para forçar limpeza imediata:
1. Acesse Settings → Danger Zone no repositório no GitHub
2. Ou aguarde o GitHub limpar automaticamente (pode demorar dias)

---

## Passo 4 — Verificar no GitHub

Após o force-push, confirme:
```bash
# Clonar em um diretório limpo e verificar
git clone https://github.com/Pansera13/TCC /tmp/tcc-verify
git log --all -- "TCC Claude/backend/.env"
# Deve retornar nada
```

---

## Checklist

- [ ] Rotar JWT_SECRET e JWT_RESET_SECRET (se reusados)
- [ ] Rotar RECAPTCHA_SECRET no Google Console
- [ ] Rotar DATABASE_URL password no Supabase
- [ ] Rotar RESEND_API_KEY no Resend
- [ ] Instalar `git-filter-repo`
- [ ] Executar `git filter-repo --invert-paths` (diga "sim" para Claude executar)
- [ ] Force-push para o GitHub
- [ ] Verificar que arquivos não aparecem mais no histórico
