# 📦 StockFlow — Passo a passo do projeto

> Sistema de controle de estoque (React + Node/Express + Supabase). Clique na seta ▶ de cada etapa para abrir.
> **Legenda:** ✅ Concluído · 🔄 Em andamento · ⏳ A fazer

**Progresso geral:** 13 etapas concluídas · 3 em andamento · 5 a fazer (inclui a etapa de segurança)

---

<details>
<summary>✅ Etapa 1 — Planejamento e organização do projeto</summary>

**Objetivo:** definir o escopo e organizar o trabalho antes de programar.

- [x] Definir o problema: controle de estoque simples para pequenas empresas
- [x] Escolher as tecnologias (React + Vite, Node/Express, banco em nuvem)
- [x] Organizar o trabalho em "mudanças" pequenas, cada uma com proposta, desenho técnico e tarefas (OpenSpec)
- [x] Versionar tudo no Git/GitHub
</details>

<details>
<summary>✅ Etapa 2 — Telas de autenticação (login e cadastro)</summary>

**Objetivo:** cada pessoa ter a sua conta.

- [x] Telas de login, cadastro e "esqueci a senha"
- [x] Senha criptografada (bcrypt) e sessão com token JWT (expira em 8 h)
- [x] Proteção contra robôs (reCAPTCHA)
</details>

<details>
<summary>✅ Etapa 3 — Banco de dados na nuvem (MySQL → Supabase)</summary>

**Objetivo:** banco online acessível de qualquer máquina.

- [x] Tabelas criadas no Supabase (usuários, produtos, movimentações, pedidos)
- [x] Driver `mysql2` trocado por `pg`, consultas convertidas para PostgreSQL
- [x] Teste de conexão (`npm run test-db`)
- [x] Variáveis de ambiente versionadas para alternar entre PC e notebook
</details>

<details>
<summary>✅ Etapa 4 — Dados de teste (seed)</summary>

**Objetivo:** testar sem cadastrar tudo na mão.

- [x] `seedProdutos20.js` (20 produtos em 13 categorias, cada um com movimentação de entrada)
- [x] Scripts de massa maior (até 100 por categoria) e de limpeza
</details>

<details>
<summary>✅ Etapa 5 — Cadastro de produtos (manual e por nota fiscal)</summary>

**Objetivo:** dar entrada no estoque rápido.

- [x] Botão "+ Novo produto" com opção manual ou NF-e
- [x] Leitura de QR code / código de barras do DANFE pela câmera, com consulta à SEFAZ
- [x] Importação de XML da nota
- [x] Botão "Sair" corrigido
</details>

<details>
<summary>✅ Etapa 6 — Saída de estoque e formulário simplificado</summary>

**Objetivo:** registrar o que sai, sem permitir quantidade negativa.

- [x] Campo "Peso (kg)" duplicado removido
- [x] Botão "Retirar" com `WithdrawModal`
- [x] Rota `POST /api/products/:id/withdraw` validando no front e no back
- [x] Cada retirada gera uma movimentação
</details>

<details>
<summary>✅ Etapa 7 — Produtos sem estoque e campo fornecedor</summary>

**Objetivo:** saber rápido o que acabou e de quem comprar.

- [x] Aba "Sem estoque"
- [x] Campo opcional `fornecedor` no banco, cadastro, edição e tabelas
</details>

<details>
<summary>✅ Etapa 8 — Separação de dados entre empresas (multi-tenant)</summary>

**Objetivo:** cada empresa vê somente os próprios dados.

- [x] Coluna `tenant_id` em usuários, produtos e movimentações
- [x] Cadastro público cria empresa isolada; usuários criados pelo admin herdam a empresa
- [x] `tenant_id` filtrado em todas as consultas
- [x] 14 tarefas concluídas
</details>

<details>
<summary>✅ Etapa 9 — Navegação e identidade visual</summary>

**Objetivo:** deixar o sistema mais claro de usar.

- [x] Barra fixa no topo (`TopNav`)
- [x] Links de LinkedIn e GitHub sempre visíveis
- [x] Foto de perfil salva por usuário
- [x] Tema claro/escuro
</details>

<details>
<summary>✅ Etapa 10 — Abas: paginação, histórico e relatórios</summary>

**Objetivo:** continuar rápido com centenas de produtos.

- [x] Paginação por categoria (15 por página) nos 4 layouts
- [x] Histórico de movimentações (quem, o quê, quando) com filtros
- [x] Aba Relatórios: resumo, top 10 retirados, giro e exportação CSV
- [x] Migração de auditoria com reversão — 17 tarefas
</details>

<details>
<summary>✅ Etapa 11 — Refinamento visual das tabelas</summary>

- [x] Linhas alternadas em todas as tabelas, nos dois temas, mantendo o destaque ao passar o mouse (20 tarefas)
</details>

<details>
<summary>✅ Etapa 12 — Correções e ajustes de ambiente</summary>

- [x] Cadastro no celular falhava por causa do reCAPTCHA sem chave: backend só exige com a chave configurada
- [x] Arquivos `.env` compartilhados entre os dois computadores
</details>

<details>
<summary>🔄 Etapa 13 — Botão de recarregar produtos</summary>

**Objetivo:** atualizar a lista na hora quando algo falhar.

- [x] Planejamento e decisão sobre o modal de Entrada
- [x] Componente `RecarregarProdutos.jsx` criado
- [x] `Dashboard.jsx` e `WithdrawModal.jsx` alterados (prop `onError`)
- [ ] Validar no navegador (carregando, falha, tema escuro, 360 px)
- [ ] Recarga automática após retirada com erro
- [ ] Teste de regressão completo
</details>

<details>
<summary>🔄 Etapa 14 — Cargo de Sócio e arquivar produtos</summary>

**Objetivo:** nível de acesso intermediário e exclusão reversível.

- [x] Proposta e desenho técnico
- [x] Tabela de permissões no servidor (`permissoes.js`)
- [x] Middleware `exigePermissao` aplicado nas rotas
- [ ] Aplicar migração `arquivar_produtos` no banco
- [ ] Regras de gestão de equipe (Funcionário < Sócio < Administrador)
- [ ] Arquivar / restaurar produto
- [ ] Modal de Entrada de estoque
- [ ] Tela de Equipe com os novos cargos
- [ ] Testes por cargo (3 contas)
</details>

<details>
<summary>🔄 Etapa 15 — Recuperação de conta e notificações</summary>

**Objetivo:** recuperar a senha com segurança.

- [x] Migrações SQL escritas e aplicadas (recuperação de conta e notificações, com reversão)
- [x] Validação do e-mail de recuperação (formato, provedor, sugestão "gmial" → "gmail")
- [x] Serviço de e-mail pelo Resend
- [x] Limitador de requisições (429)
- [x] Cadastro e perfil com e-mail de recuperação
- [x] Recuperação em 4 passos: buscar → enviar código → verificar → redefinir
- [x] API de notificações
- [x] Testes automatizados do backend (5 arquivos)
- [ ] Tela de cadastro com o novo campo
- [ ] Tela "Esqueci minha senha" em passos
- [ ] Modal de e-mail de recuperação e sino de notificações
- [ ] Notificações em tempo real
- [ ] Teste ponta a ponta com 3 contas e regressão
</details>

<details>
<summary>⏳ Etapa 16 — Convidar contas existentes para a equipe</summary>

- [x] Pasta da mudança criada
- [ ] Definir o fluxo do convite
- [ ] Proposta e tarefas
- [ ] Implementar
</details>

<details>
<summary>🔄 Etapa 17 — Segurança e defesa contra ataques</summary>

**Objetivo:** proteger o sistema e os dados dos clientes contra os ataques mais comuns (baseado no OWASP Top 10).

**✅ Defesas já implementadas**

- [x] **Roubo de senhas:** senhas guardadas com hash bcrypt, nunca em texto puro
- [x] **Sessão sequestrada:** token JWT assinado, expira em 8 h; a cada requisição o servidor reconfere no banco se a conta existe e está ativa, e pega o cargo do banco (não do token)
- [x] **Acesso indevido (controle de acesso):** permissões validadas no servidor por cargo; esconder botão no front não é a defesa
- [x] **Vazamento entre empresas:** `tenant_id` filtrado em todas as consultas
- [x] **SQL Injection:** consultas parametrizadas (`$1`, `$2`), sem concatenar texto do usuário
- [x] **Robôs:** reCAPTCHA no cadastro e na recuperação
- [x] **Força bruta na recuperação de senha:** limite por IP e por conta (resposta 429 com tempo de espera)
- [x] **Adivinhar o código de 6 dígitos:** gerado com `crypto.randomInt`, guardado só como hash HMAC, vale 15 min, uso único, 5 erros invalidam
- [x] **Reaproveitar o código:** novo envio invalida o anterior; token de redefinição de uso único e curto (10 min)
- [x] **Descobrir quais contas existem:** busca devolve e-mail e nome mascarados
- [x] **Rotas antigas e inseguras:** removidas (respondem 404)
- [x] **CORS:** só aceita origens locais/rede interna
- [x] **Erros:** o servidor devolve mensagem genérica, sem mostrar detalhes internos
- [x] **Reversão de banco:** toda migração tem SQL de reversão

**⏳ Defesas a implementar**

- [ ] **Força bruta no login:** limitar tentativas por IP e por e-mail (ex.: 5 em 15 min) e bloqueio temporário — usar o mesmo `limiteRequisicoes.js`
- [ ] **Limite no cadastro e no envio de código:** hoje só há limite por conta no envio; incluir por IP
- [ ] **Cabeçalhos de segurança (Helmet):** protege contra clickjacking, sniffing de tipo de arquivo e XSS refletido
- [ ] **Limite de tamanho do corpo:** `express.json({ limit: '100kb' })` contra requisições gigantes (DoS)
- [ ] **Limite no upload de XML:** tamanho máximo e só tipo `.xml` no `multer`; desativar entidades externas no `xml2js` (ataque XXE)
- [ ] **Limite geral na API:** teto de requisições por IP em todas as rotas contra DoS simples
- [ ] **Política de senha:** mínimo de 8 caracteres também no cadastro, bloquear senhas comuns
- [ ] **Segredos fora do Git:** hoje os `.env` estão versionados (necessário para alternar de máquina). Antes de publicar: manter o repositório **privado**, trocar `JWT_SECRET`, chave do Resend e senha do banco por valores novos e fortes e remover do histórico
- [ ] **HTTPS obrigatório e CORS de produção:** só o domínio oficial do sistema
- [ ] **RLS no Supabase:** ativar Row Level Security em todas as tabelas, para o banco se defender mesmo se a API falhar
- [ ] **Proxy confiável:** configurar `trust proxy` para o limitador enxergar o IP real em produção
- [ ] **Atualizar dependências:** rodar `npm audit` e corrigir vulnerabilidades
- [ ] **Registro de eventos (logs):** gravar logins falhos, mudanças de cargo e redefinições de senha
- [ ] **Aviso por e-mail:** avisar o dono quando a senha for alterada
- [ ] **Backup do banco** e teste de restauração
- [ ] **Teste de ataque simulado:** tentar SQL injection, força bruta e acesso a dados de outra empresa e anotar os resultados para a monografia
</details>

<details>
<summary>⏳ Etapa 18 — Testes finais, documentação e entrega do TCC</summary>

- [ ] Teste manual completo (todas as abas, celular 360 px, tema claro e escuro)
- [ ] `npm run build` e `npm run lint` sem erros
- [ ] Publicar o sistema online
- [ ] Escrever a monografia (incluir capítulo de segurança) e preparar a apresentação
</details>
