# Design

## Context

Estado observado em 19/10/2026:

- **Recuperação de senha**: não existe no backend (`authController` exporta só `register` e `login`; `routes/auth.js` só tem essas duas rotas). `App.jsx` não tem a rota `/forgot-password`, mas `Login.jsx` ainda tem o link "Esqueci a senha". `frontend/src/pages/ForgotPassword.jsx` existe sem rastreio no git e importa funções que já saíram de `services/api.js`, ou seja, está quebrado. A spec principal `auth/forgot-password` e três requisitos de `auth/backend` ainda descrevem o fluxo antigo.
- **Contas**: `usuarios` tem `tenant_id`. Conta principal (dona) tem `tenant_id = id` (`User.create`); conta de equipe é criada por `userController.createUser` com o `tenant_id` do administrador, logo `tenant_id <> id`. O cargo (`admin`, `socio`, `user`) é independente disso.
- **Banco**: Supabase compartilhado com o sistema de Pedidos; SQL é aplicado à mão pelo usuário, com script de reversão, em `backend/sql/`. O Realtime já é usado em `products` com a chave pública (`supabaseClient.js`); o backend fala com o banco como usuário `postgres` (`DATABASE_URL`).
- **E-mail**: `nodemailer` está em `package.json` e o `.env.example` tem variáveis `EMAIL_*` do Mailtrap, mas nenhum arquivo em `backend/src` os usa hoje.
- **Segredos**: `JWT_SECRET` e `JWT_RESET_SECRET` existem no `.env`. `RECAPTCHA_SECRET` é opcional (cadastro já trata a ausência).
- **Barra superior**: `TopNav.jsx` recebe o estado do menu do perfil por props do `Dashboard.jsx`. O "perfil" é um menu suspenso (foto, nome, sair), não uma página.
- Existe change em andamento (`adicionar-cargo-socio-e-arquivar-produtos`) que reescreve cargos e permissões, e a spec `team/team-management` já sincronizada.

Motivação: ver `proposal.md`.

## Goals / Non-Goals

**Goals:**
- Recuperar a senha de contas principais por código enviado a um e-mail de recuperação separado do login.
- Reduzir o risco de abuso (enumeração de contas, força bruta do código, spam de e-mail).
- Entregar uma central de notificações genérica, já usada para avisar contas antigas.

**Non-Goals:**
- Confirmar o e-mail de recuperação com código (melhoria futura registrada: confirmar o e-mail no cadastro e na troca com um código).
- Redefinição de senha de contas de equipe pelo administrador (só citada na tela de recuperação).
- Domínio próprio e verificação no Resend.
- Outros tipos de notificação além do primeiro.
- Autenticação em dois fatores.

## Decisions

### D1. Quem é "conta principal" e "conta de equipe"
Conta principal = `tenant_id = id`. Conta de equipe = `tenant_id <> id`. Regra usada em recuperação, perfil e notificações, no banco e no backend, sem coluna nova. **Alternativa descartada**: coluna `tipo_conta` (duplicaria uma informação que já existe e pode divergir).

### D2. Colunas novas em `usuarios`
- `email_recuperacao text` (nulo para contas antigas e de equipe), gravado em minúsculas e sem espaços.
- Reaproveita `reset_code_hash` e `reset_code_expires_at` (já existem na tabela, mas **precisam ser conferidos no banco** antes de aplicar; a migração usa `ADD COLUMN IF NOT EXISTS`).
- `reset_code_tentativas integer not null default 0` (erros do código atual).
- O instante do último envio sai de `reset_code_expires_at - 15 minutos`, sem coluna extra. **Alternativa descartada**: coluna `reset_code_enviado_em` (redundante com o prazo fixo).
- `senha_hash` continua sendo a única senha; trocar a senha apaga o código.

### D3. Fluxo de recuperação em quatro chamadas, sem sessão
1. `buscar { identificador, recaptchaToken }` → localiza a conta (e-mail de login ou CPF/CNPJ, reaproveitando `User.findByIdentifier` restrito a e-mail e CPF/CNPJ), aplica as regras de "sem saída" e devolve `busca_token` (JWT assinado com `JWT_RESET_SECRET`, escopo `recuperacao-busca`, validade de 10 min, contém só o id) e os dados mascarados.
2. `enviar-codigo { busca_token }` → gera código, grava hash, envia o e-mail.
3. `verificar-codigo { busca_token, codigo }` → confere hash, prazo e tentativas; em caso de acerto devolve `reset_token` (JWT escopo `recuperacao-redefinir`, 10 min) que carrega uma impressão do hash vigente.
4. `redefinir-senha { reset_token, nova_senha }` → confere que o código gravado ainda é o mesmo (impressão), troca a senha e zera código e tentativas. Assim o token vale uma única vez mesmo sendo JWT.

O token de busca evita reenviar o identificador e permite que o "Não, voltar" não deixe rastro. **Alternativa descartada**: enviar o identificador de novo em cada chamada (mais exposição, mais pontos de enumeração).

### D4. Código
`crypto.randomInt(0, 1_000_000)` preenchido com zeros à esquerda; guardado com hash (SHA-256 com `JWT_RESET_SECRET` como chave, HMAC) porque o espaço de 10^6 valores torna um hash simples quebrável se a coluna vazar. Comparação em tempo constante (`crypto.timingSafeEqual`). 15 min de validade, 5 erros invalidam, novo envio substitui o anterior, 60 s entre envios.

### D5. Limites de requisição
Limitador simples em memória (mapa com janelas deslizantes), sem nova dependência: busca por IP (10 a cada 15 min), envio por conta (3 por hora) e por IP (10 por hora), troca do e-mail no perfil por usuário (5 senhas erradas por 15 min). Resposta HTTP 429 com segundos para tentar de novo. **Limitação**: zera ao reiniciar o servidor e não vale entre várias instâncias; aceitável para um servidor único de TCC. **Alternativa descartada**: tabela de tentativas no banco (mais código e SQL para o mesmo efeito neste porte).

### D6. Privacidade da busca
Mostrar nome e e-mail mascarados antes de enviar o código revela que a conta existe e dá uma dica do e-mail. Aceito por decisão de produto; mitigações: máscara forte (nome com até 2 letras visíveis, parte local do e-mail com 1 letra visível e asteriscos de tamanho fixo, domínio visível por pertencer à lista de provedores), reCAPTCHA quando configurado, limite por IP e erros distintos apenas nos casos já previstos na spec. O e-mail de login nunca é devolvido.

### D7. Envio pelo Resend
`services/emailService.js` faz `axios.post('https://api.resend.com/emails', ..., { headers: { Authorization: 'Bearer ' + RESEND_API_KEY } })` com `from = EMAIL_FROM`, timeout de 10 s. Sem domínio verificado, o Resend só entrega ao e-mail da própria conta Resend e exige `onboarding@resend.dev`; isso vai para o `.env.example` e o README. Em falha, o código gravado é apagado e o limite de reenvio não é consumido. `nodemailer` e as variáveis `EMAIL_*` ficam sem uso; remover é decisão posterior (ver Perguntas em aberto).

### D8. Validação do e-mail de recuperação
Módulo `utils/emailRecuperacao.js` no backend com a lista de provedores, o formato, a comparação com o login e a sugestão por distância de edição ≤ 2 (o maior domínio candidato mais próximo; empate resolve pelo primeiro da lista). O frontend mantém uma cópia da lista e da sugestão só para resposta imediata; a validação do backend prevalece e devolve `field` e `sugestao` na resposta 400. **Alternativa descartada**: endpoint que entrega a lista ao frontend (uma ida à rede a mais por tela, sem ganho de segurança).

### D9. Perfil
Sem página de perfil: um item "✉️ E-mail de recuperação" no menu do perfil abre um modal. `GET /api/profile` passa a devolver `email_recuperacao` (o dono vê o próprio e-mail completo) e `conta_principal`. `PUT /api/profile/email-recuperacao { email_recuperacao, confirmacao, senha_atual }` confere a senha com bcrypt e aplica D8. Conta de equipe recebe 403.

### D10. Notificações: modelo e API
- `notificacoes(id, usuario_id → usuarios ON DELETE CASCADE, tipo, titulo, texto, acao, lida, dispensada, criado_em)`, índice por `(usuario_id, dispensada)`. Resolver = `dispensada = true` e `lida = true`, sem coluna extra. Índice único parcial `(usuario_id, tipo)` onde `dispensada = false` impede duplicata ativa do mesmo tipo.
- API autenticada, sempre filtrando por `req.user.id`: `GET /api/notificacoes` (itens não dispensados + `nao_lidas`), `POST /api/notificacoes/marcar-lidas`, `POST /api/notificacoes/:id/dispensar`. Conta de equipe simplesmente recebe lista vazia.
- Migração semeia a notificação `tipo = 'cadastrar-email-recuperacao'`, `acao = 'abrir-email-recuperacao'`, só para contas principais ativas com `email_recuperacao IS NULL` e sem notificação desse tipo (idempotente).

### D11. Notificações em tempo real sem expor conteúdo
Tabela `notificacoes` **fora** da publicação do Realtime e com RLS ligado sem política para `anon`. Uma tabela mínima `notificacoes_aviso(usuario_id pk, atualizado_em)` é atualizada por gatilho a cada insert/update em `notificacoes` e é a única publicada, com política de leitura para `anon` (expõe apenas "o usuário N mudou às T"). O frontend assina com filtro `usuario_id=eq.<id>` e, ao receber o aviso, chama `GET /api/notificacoes`. Consulta periódica de 60 s e recarga ao voltar o foco da aba cobrem falha do Realtime. **Alternativas descartadas**: publicar `notificacoes` com política aberta (qualquer cliente com a chave pública leria títulos e textos de todos); canal Broadcast com nome do usuário (o nome do canal seria adivinhável).
Resíduo: a chave pública enxerga ids de usuário e horários; como `usuarios.id` é sequencial, isso revela atividade, não conteúdo. Registrado como risco aceito.

### D12. Interface
- `TopNav.jsx`: componente `NotificationBell` entre o alternador de tema e o perfil; menu suspenso à direita; fecha ao clicar fora (mesmo padrão do menu do perfil); não aumenta a barra (≤ 1,5 cm).
- `ForgotPassword.jsx` reescrita em passos (buscar → confirmar → código → nova senha → login), reCAPTCHA só se `VITE_RECAPTCHA_SITE_KEY` existir; rota `/forgot-password` volta ao `App.jsx`; link do login passa a "Esqueci minha senha".
- `Register.jsx`: dois campos de e-mail de recuperação, `autoComplete="new-password"` nas duas senhas.
- Spec do bell fica em `top-navigation` (que descreve a barra); `dashboard/navigation` trata só das abas e não muda.

## Risks / Trade-offs

- [Enumeração de contas pela busca] → máscara forte, limite por IP, reCAPTCHA opcional; trade-off de privacidade aceito e registrado na spec.
- [E-mail de recuperação digitado errado no cadastro (sem código de confirmação)] → digitação dupla, lista de provedores e sugestão; confirmar por código fica como melhoria futura. Um e-mail errado, mas válido, enviaria códigos a um terceiro: a senha só muda com o código, e o dono pode corrigir o e-mail no perfil com a senha atual.
- [Resend sem domínio verificado só entrega ao dono da conta Resend] → documentado; em produção real é preciso verificar um domínio.
- [Limitador em memória] → zera no reinício e não é distribuído; suficiente para o porte atual.
- [Migração mexe no banco compartilhado com Pedidos] → só colunas anuláveis e tabelas novas; Pedidos ignora; reversão em script.
- [Colunas `reset_code_*` podem não existir ou ter outro tipo] → `ADD COLUMN IF NOT EXISTS` e conferência antes de aplicar (tarefa de pausa de aprovação).
- [Conflito com a change de cargos/equipe] → a regra "conta de equipe = `tenant_id <> id`" vale também para uma eventual conta existente convidada para outra equipe (proposta separada ainda não escrita); revisar quando ela existir.
- [Realtime em `notificacoes_aviso` ainda depende de configurar publicação e RLS no Supabase] → verificar em ambiente real; sem ele, o polling mantém a funcionalidade.

## Migration Plan

1. Criar `backend/sql/migracao_recuperacao_conta.sql` (colunas de `usuarios`) e `migracao_notificacoes.sql` (tabelas, índices, RLS, gatilho, publicação, primeira notificação), com `reverter_recuperacao_conta.sql` e `reverter_notificacoes.sql`. Não executar.
2. Pausa de aprovação: o usuário revisa e aplica no Supabase e confirma; conferência por consulta.
3. Backend (validação, serviços, rotas, limites), depois frontend, depois verificação ponta a ponta.
4. Ordem de deploy: banco antes do backend (o cadastro novo grava `email_recuperacao`).
5. Reversão: scripts de reversão; o código anterior segue funcionando porque tudo é aditivo (o cadastro antigo seria recusado pelo backend novo, então reverter exige voltar o backend também).

## Open Questions

- Remover `nodemailer` e as variáveis `EMAIL_*` do Mailtrap, hoje sem uso? Não muda specs nem tarefas desta change.
- Manter ou remover o botão/aviso "para suporte" nas mensagens de conta antiga sem e-mail (texto exato da orientação)?
- Reenvio com contagem de 60 s: aceitar o intervalo fixo ou crescer a cada reenvio?
