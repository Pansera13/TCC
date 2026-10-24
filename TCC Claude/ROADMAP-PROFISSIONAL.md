# StockFlow — Roteiro para nível profissional

Só o que **falta**. O que já existe está na seção final, para você não refazer.
Prioridade: 🔴 fazer primeiro · 🟡 alto impacto · 🟢 diferencial

---

## 1. Segurança da API

- [ ] 🔴 **`helmet`** no `server.js` (cabeçalhos CSP, HSTS, X-Frame-Options...)
- [ ] 🔴 **Limite de body**: `express.json({ limit: '100kb' })`
- [ ] 🔴 **CORS fechado em produção**: hoje libera qualquer IP de rede privada (192.168.x, 10.x, 172.x). Usar lista de domínios em variável de ambiente (`CORS_ORIGINS`)
- [ ] 🔴 **Rate limit no `/login` e `/register`**: hoje só a recuperação de senha tem limite
- [ ] 🔴 **Bloqueio de conta** após N logins errados (hoje só limita por IP, e só na recuperação)
- [ ] 🔴 **Validação de entrada** em todas as rotas com `zod` (hoje a validação é manual, campo a campo)
- [ ] 🟡 **Rate limit persistente** (Redis ou tabela): o atual é em memória e zera ao reiniciar o servidor
- [ ] 🟡 **`trust proxy`** configurado corretamente (senão o IP do rate limit fica errado atrás de proxy)
- [ ] 🟡 **Upload (multer)**: limitar tamanho e validar MIME + extensão
- [ ] 🟡 **XML da NF-e**: limitar tamanho e desativar entidades externas (XXE)
- [ ] 🟡 **Chamada ao reCAPTCHA**: enviar `secret` e `response` no corpo (POST) em vez de query string, para não vazar o segredo em logs
- [ ] 🟡 **Handler de erro**: não devolver `err.message` bruto em produção (pode vazar detalhe interno)
- [ ] 🟢 **2FA (TOTP)** com `otplib` + QR code
- [ ] 🟢 **Refresh token** (acesso 15 min + refresh em cookie `httpOnly`/`secure`/`sameSite`). Hoje o JWT dura 8h e fica no `sessionStorage` (legível por JavaScript)
- [ ] 🟢 **Verificação de e-mail** no cadastro
- [ ] 🟢 **Listar e revogar sessões** ativas
- [ ] 🟢 **Política de senha forte** (tamanho mínimo, lista de senhas comuns)

## 2. Dados, banco e LGPD

- [ ] 🔴 **RLS em todas as tabelas** (hoje só `notificacoes` tem). Políticas por `tenant_id` como segunda barreira além do filtro no código
- [ ] 🔴 **Transação + `SELECT ... FOR UPDATE`** nas movimentações de estoque (evita saldo inconsistente com dois usuários ao mesmo tempo). Hoje não há `BEGIN` no `movementService`
- [ ] 🟡 **Constraints**: `CHECK (quantidade >= 0)`, FKs e índices nas colunas de busca (confirmar quais já existem)
- [ ] 🟡 **Migrations versionadas** (`node-pg-migrate`, Prisma ou Supabase CLI) no lugar dos `.sql` soltos
- [ ] 🟡 **Auditoria ampliada**: hoje cobre só movimentações. Incluir login, falha de login, mudança de cargo, desativar conta, troca de senha (tabela imutável com IP)
- [ ] 🟡 **Backups**: rotina definida e **teste de restauração** documentado
- [ ] 🟡 **LGPD**: Política de Privacidade, Termos de Uso, aceite registrado no cadastro
- [ ] 🟡 **LGPD**: exportar e excluir/anonimizar dados do titular
- [ ] 🟢 **Criptografia de campo** (AES-256-GCM) para CPF/CNPJ e telefone
- [ ] 🟢 **Mascarar dados sensíveis** em logs e telas (CPF parcial)
- [ ] 🟢 **Política de retenção** (por quanto tempo guardar logs e dados arquivados)

## 3. Qualidade e testes

- [ ] 🔴 **`npm test` funcionando**: o script ainda é o placeholder, apesar de existirem arquivos em `backend/test`
- [ ] 🔴 **CI no GitHub Actions** (lint + testes + build + `npm audit`). Não existe `.github/`
- [ ] 🟡 **Testes de API** com `supertest`, meta ≥ 70% de cobertura
- [ ] 🟡 **Testes E2E** do frontend (Playwright): login, entrada, saída, cadastro de produto
- [ ] 🟡 **Dependabot/Renovate** + `gitleaks` (varredura de segredos)
- [ ] 🟡 **CodeQL** (análise estática grátis no GitHub)
- [ ] 🟡 **ESLint/Prettier no backend** + Husky/lint-staged (o frontend já tem oxlint)
- [ ] 🟢 TypeScript (ou ao menos JSDoc nos serviços)
- [ ] 🟢 **Commits descritivos** (Conventional Commits) em vez de "21/10 1.1", e `main` protegida com PR

## 4. Observabilidade

- [ ] 🟡 **Logs estruturados** com `pino` + `pino-http` e request-id (hoje só `console.error`)
- [ ] 🟡 **Sentry** no backend e no frontend
- [ ] 🟡 **Endpoints `/health` e `/ready`**
- [ ] 🟢 Monitor de uptime (UptimeRobot / Better Stack)
- [ ] 🟢 Métricas (Prometheus + Grafana)

## 5. API e documentação

- [ ] 🟡 **Swagger/OpenAPI** (`swagger-ui-express` ou Scalar): o que mais impressiona na apresentação
- [ ] 🟡 **Versionar a API**: `/api/v1/...`
- [ ] 🟡 **Paginação, filtro e ordenação** padronizados nas listagens (confirmar o que já existe)
- [ ] 🟡 **Idempotência** nas movimentações (evitar entrada duplicada por clique duplo)
- [ ] 🟢 Padronizar formato de erro (`{ code, message, details }`)

## 6. Integrações

- [ ] 🟡 **E-mail com domínio próprio** (Resend sem domínio verificado só entrega ao e-mail da própria conta) + SPF/DKIM/DMARC
- [ ] 🟡 **NF-e**: validar chave de acesso/assinatura; opcional consultar SEFAZ (Focus NFe, NFe.io)
- [ ] 🟢 **Relatórios em PDF e Excel** (`pdfkit`/`exceljs`). Hoje só há CSV
- [ ] 🟢 **Alertas por web push ou WhatsApp** (hoje só notificações dentro do sistema)
- [ ] 🟢 Consulta de GTIN em base externa (Cosmos / Open Food Facts) — confirmar o que o `barcodeService` já faz
- [ ] 🟢 Pagamento (Stripe/Mercado Pago), só se houver planos

## 7. Frontend

- [ ] 🟡 **Cookie `httpOnly`** em vez de token em `sessionStorage` (junto do refresh token)
- [ ] 🟡 **TanStack Query** (cache, retry, loading) e **React Hook Form + zod**
- [ ] 🟡 **ErrorBoundary**, páginas 403/404
- [ ] 🟡 **Acessibilidade**: `eslint-plugin-jsx-a11y`, Lighthouse > 90
- [ ] 🟡 **Remover `basic-ssl` do build de produção** (é só para dev, a câmera do celular exige HTTPS)
- [ ] 🟡 **CSP** compatível com Vite/Tailwind em produção
- [ ] 🟢 **PWA** instalável (manifest + service worker), útil para o leitor de código de barras
- [ ] 🟢 Skeletons de carregamento, estados vazios, toasts padronizados
- [ ] 🟢 i18n (`react-i18next`), se quiser pt/en

## 8. Infra e deploy

- [ ] 🟡 **Dockerfile + docker-compose** (sobe tudo com um comando)
- [ ] 🟡 **Ambientes** dev / staging / produção com variáveis separadas
- [ ] 🟡 **Hospedagem**: front (Vercel/Netlify), back (Render/Railway/Fly), banco (Supabase)
- [ ] 🟡 **HTTPS + redirecionamento HTTP→HTTPS**, domínio próprio
- [ ] 🟢 Cloudflare na frente (WAF/DDoS)
- [ ] 🟢 Gerenciador de segredos em produção

## 9. Documentação (muito valorizada em TCC)

- [ ] 🔴 **README raiz**: o projeto só tem `frontend/README.md`. Incluir arquitetura, como rodar, variáveis de ambiente, prints
- [ ] 🟡 **Diagramas** em Mermaid: DER, casos de uso, arquitetura, fluxo de autenticação
- [ ] 🟡 **Matriz cargo × permissão** documentada (admin / sócio / user)
- [ ] 🟡 **Documento de segurança**: modelo de ameaças (STRIDE) + checklist OWASP Top 10 marcado
- [ ] 🟢 CHANGELOG e licença

---

## Ordem sugerida

1. **Semana 1 (essencial):** helmet, limite de body, CORS fechado, rate limit no login, zod, `npm test`, README
2. **Semana 2 (alto impacto):** RLS completo, transações com lock, CI, Swagger, auditoria ampliada, LGPD
3. **Semana 3 (diferencial):** 2FA, refresh + cookie httpOnly, Sentry/pino, PDF/Excel, PWA
4. **Fechamento:** Docker, deploy com HTTPS, documento de segurança

---

## ✅ Já existe (não precisa refazer)

| Área | O que já está pronto |
|---|---|
| Senhas | bcrypt com custo 12 (cadastro, troca e recuperação) |
| Autenticação | JWT; o middleware relê a conta no banco a cada requisição (conta desativada perde acesso na hora; cargo vem do banco, não do token) |
| Autorização | RBAC com cargos `admin` / `socio` / `user`, middleware `exigePermissao`, `utils/permissoes.js`, teste de permissões |
| Multi-empresa | Isolamento por `tenant_id` nos controllers (change `add-tenant-isolation`) |
| Recuperação de senha | Código de uso único com hash, expiração, limite de tentativas, token de 10 min, rate limit por IP |
| Anti-bot | reCAPTCHA já validado **no backend** |
| Rate limit | Middleware próprio em memória (só na recuperação e na troca de senha) |
| Auditoria | Movimentações registram edição/remoção com valores antes/depois (`detalhes jsonb`), usuário e índices |
| Soft delete | Arquivar produtos (com script de reversão) |
| RLS | Apenas nas tabelas de notificações |
| E-mail | Serviço com Resend |
| Notificações | Sino de notificações dentro do sistema |
| Estoque | Entrada/saída, código de barras, importação de NF-e (XML), relatórios em CSV, leitor por câmera (`html5-qrcode`) |
| Banco | Supabase/Postgres com queries parametrizadas; scripts `.sql` de migração **e** de reversão |
| Segredos | `.env` no `.gitignore`, `.env.example` versionado |
| Testes | Existem testes em `backend/test` (permissões, recuperação, e-mail, NF-e, notificações, cadastro) |
| Processo | Specs e histórico de mudanças com OpenSpec |
| Sessão no front | `sessionStorage` por aba (login isolado), limpeza de resíduos antigos |
| UX | Tema escuro/claro, Tailwind 4, Vite com proxy e HTTPS de dev, lint com oxlint |

> Itens marcados "confirmar" valem uma checagem: não li todos os controllers/SQL, só os pontos acima.
