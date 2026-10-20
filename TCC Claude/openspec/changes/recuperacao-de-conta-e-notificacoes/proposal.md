# Proposal

## Why

Hoje não existe nenhum caminho para quem esquece a senha: a recuperação antiga (e-mail + CPF/CNPJ) foi removida do código, mas o link "Esqueci a senha" continua no login e as specs ainda a descrevem. Sem um canal de contato separado do e-mail de login, também não há como recuperar a conta com segurança. Esta change cria esse canal (o e-mail de recuperação), refaz a recuperação de senha por código e adiciona uma central de notificações, que já nasce avisando as contas existentes a cadastrarem o e-mail de recuperação.

## What Changes

- **Cadastro**: novo campo obrigatório "E-mail de recuperação", digitado duas vezes, diferente do e-mail de login, de um provedor permitido (lista fechada), com sugestão para erros de digitação ("Você quis dizer gmail.com?"). Pode repetir entre contas. Sem código de confirmação por ora. Os campos de senha passam a usar `autoComplete="new-password"`.
- **Perfil**: o dono da conta cadastra e edita o e-mail de recuperação a qualquer momento, pelo menu do perfil; trocar exige a senha atual.
- **Recuperação de senha** (refeita, rota `/forgot-password`, link "Esqueci minha senha" no login): buscar conta → confirmar conta e e-mail mascarados → enviar código de 6 dígitos → digitar o código → definir nova senha. Código com hash, 15 min de validade, uso único, 5 tentativas, 60 s entre reenvios, limites por conta e por IP e reCAPTCHA quando configurado.
- **Envio de e-mail** pelo Resend (API HTTP, sem nova dependência).
- **Notificações**: sino com contador de não lidas ao lado do perfil na barra superior, em todas as contas, com lista que atualiza em tempo real. Tabela genérica de notificações; a primeira, "Cadastre seu e-mail de recuperação", é criada por migração só para contas principais antigas sem o e-mail.
- **Contas de equipe** (Funcionário/Sócio criadas por administrador) não têm e-mail de recuperação nem a notificação; a tela de recuperação as orienta a pedir ao administrador.
- **BREAKING**: `POST /api/auth/register` passa a exigir `email_recuperacao` e `email_recuperacao_confirmacao`. As rotas de recuperação antigas (`forgot-password`, `verify-code`, `reset-password`) saem da spec; o código já não as tem.
- Nova migração SQL (com reversão) para a coluna do e-mail, controle de tentativas e tabelas de notificação.

## Capabilities

### New Capabilities
- `auth/recovery-email`: cadastro e edição do e-mail de recuperação pelo dono da conta, a partir do menu do perfil (regras de validação, senha atual, quem pode).
- `notifications/notification-center`: central de notificações por usuário (sino, contador, lista, ler, dispensar, resolver, tempo real) e a notificação "Cadastre seu e-mail de recuperação".

### Modified Capabilities
- `auth/register`: campos do formulário (e-mail de recuperação em dobro e `autoComplete` das senhas) e nova regra de validação do e-mail de recuperação.
- `auth/login`: o link passa a se chamar "Esqueci minha senha".
- `auth/forgot-password`: reescrita completa do fluxo (busca, confirmação mascarada, código, nova senha, casos sem saída, limites, envio por Resend, privacidade).
- `auth/backend`: rota de cadastro com o e-mail de recuperação; troca das três rotas antigas de recuperação pelas novas.
- `top-navigation`: sino de notificações ao lado do perfil (a spec `dashboard/navigation` trata só das abas; a barra superior é descrita em `top-navigation`).

## Impact

- **Backend**: `controllers/authController.js` (cadastro e recuperação), `models/User.js`, `routes/auth.js`, `routes/profile.js`, novas rotas e controller de notificações, serviço de e-mail (Resend), validação do e-mail de recuperação, limitador de requisições em memória, `.env` e `.env.example` (`RESEND_API_KEY`, `EMAIL_FROM`).
- **Banco** (Supabase compartilhado com o sistema de Pedidos): `usuarios` ganha colunas; novas tabelas `notificacoes` e `notificacoes_aviso`; SQL em `backend/sql/` com reversão. Aplicado manualmente pelo usuário.
- **Frontend**: `Register.jsx`, `Login.jsx`, `ForgotPassword.jsx` (reescrita) e rota em `App.jsx`, `TopNav.jsx`, `Dashboard.jsx`, novos componentes de notificações e do e-mail de recuperação, `services/api.js`.
- **Externo**: conta e chave no Resend (sem domínio verificado só entrega no e-mail da própria conta Resend).
- Não altera a consulta de NF-e, o upload de XML nem o leitor de câmera.
