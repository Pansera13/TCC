# Tasks

## 1. SQL e pausa de aprovação do banco

- [ ] 1.1 **Pausa de aprovação do banco.** Criar `backend/sql/migracao_recuperacao_conta.sql`, `backend/sql/migracao_notificacoes.sql` e as reversões `reverter_recuperacao_conta.sql` e `reverter_notificacoes.sql` conforme D2, D10 e D11 do `design.md` (colunas de `usuarios`, tabelas `notificacoes` e `notificacoes_aviso`, índices, RLS, gatilho, publicação do Realtime e a primeira notificação para contas principais sem e-mail), **sem executá-los**. Pedir que o usuário revise, confira se `reset_code_hash` e `reset_code_expires_at` existem em `usuarios`, aplique no Supabase e confirme. Verificar com a consulta de conferência incluída nos arquivos (colunas e tabelas existem; notificações criadas = contas principais sem e-mail). Sem a confirmação, não seguir para a seção 2.

## 2. Backend: validação e envio

- [ ] 2.1 Criar `backend/src/utils/emailRecuperacao.js` (formato, lista de provedores, comparação com o e-mail de login sem espaços e sem diferenciar maiúsculas, sugestão por distância de edição) e `backend/test/email-recuperacao.test.js`. Verificar com `node test/email-recuperacao.test.js`: aceita `a@gmail.com`; recusa `a@exemplo.com`; recusa igual ao login com maiúsculas/espaços; sugere `gmail.com` para `gmial.com`; não sugere nada para domínio distante.
- [ ] 2.2 Criar `backend/src/services/emailService.js` (Resend por `axios`, `RESEND_API_KEY`, `EMAIL_FROM`, timeout de 10 s) e documentar `RESEND_API_KEY`, `EMAIL_FROM` e o limite do Resend sem domínio verificado em `backend/.env.example` e no `README.md`. Verificar com teste que simula o `axios` (sucesso, falha e chave ausente) e que o `.env.example` lista as duas variáveis.
- [ ] 2.3 Criar o limitador em memória (`backend/src/middleware/limiteRequisicoes.js`) com janelas por chave (IP ou conta) e resposta 429 com segundos restantes. Verificar com teste: a N+1ª chamada na janela recebe 429 e, passada a janela, volta a passar.

## 3. Backend: cadastro e perfil

- [ ] 3.1 `POST /api/auth/register`: exigir `email_recuperacao` e `email_recuperacao_confirmacao`, validar com 2.1 (400 com `field` e `sugestao`) e gravar em minúsculas; `User.create` passa a receber o campo. Verificar com `curl`/script: payload válido responde 201 e grava; sem o campo, igual ao login, provedor fora da lista e confirmação diferente respondem 400; o mesmo e-mail de recuperação em duas contas é aceito.
- [ ] 3.2 `GET /api/profile` devolve `email_recuperacao` e `conta_principal` (`tenant_id = id`); criar `PUT /api/profile/email-recuperacao` (senha atual com bcrypt, regras de 2.1, 403 para conta de equipe, 429 após erros repetidos de senha) que também resolve a notificação do tipo `cadastrar-email-recuperacao`. Verificar com testes de rota: troca válida, senha errada, e-mail inválido, conta de equipe (403) e notificação resolvida.

## 4. Backend: recuperação de senha

- [ ] 4.1 Implementar `POST /api/auth/recuperacao/buscar` e `enviar-codigo` (D3 a D7): casos sem saída (404, 422, 403 equipe, 403 desativada), máscara de nome e e-mail, reCAPTCHA só com `RECAPTCHA_SECRET`, código com `crypto.randomInt`, hash HMAC, 15 min, 60 s entre envios, limites por IP e por conta e rollback do código se o envio falhar. Verificar com testes (Resend simulado) para cada caso da spec `auth/forgot-password`, incluindo que a resposta da busca não contém dado completo da conta.
- [ ] 4.2 Implementar `verificar-codigo` e `redefinir-senha`: 5 tentativas invalidam o código, novo envio invalida o anterior, token de redefinição de uso único, senha nova com no mínimo 8 caracteres e novo hash bcrypt, código e tentativas zerados. Verificar com testes: código certo, errado (contagem), 5 erros, expirado, reuso do código e do token, redefinição bem-sucedida e login com a senha nova.
- [ ] 4.3 Remover do código qualquer resquício do fluxo antigo (imports não usados) e conferir que as rotas antigas (`forgot-password`, `verify-code`, `reset-password`) respondem 404. Verificar com `grep` e `curl`.

## 5. Backend: notificações

- [ ] 5.1 Criar `controllers/notificacaoController.js` e `routes/notificacoes.js` (`GET /api/notificacoes`, `POST /api/notificacoes/marcar-lidas`, `POST /api/notificacoes/:id/dispensar`), registrar em `server.js`, sempre filtrando por `req.user.id`. Verificar com testes de rota: lista só do próprio usuário, marcar como lidas zera o contador sem remover itens, dispensar remove, dispensar notificação alheia responde 404, conta de equipe recebe lista vazia.

## 6. Frontend: cadastro, login e recuperação

- [ ] 6.1 `Register.jsx`: campos "E-mail de recuperação" e confirmação, validação local (formato, diferente do login, provedor permitido, sugestão com botão para aplicar), erros vindos do backend por `field`, e `autoComplete="new-password"` nas duas senhas. Atualizar `services/api.js`. Verificar no navegador cada cenário da spec `auth/register` e no `npm run build`.
- [ ] 6.2 Reescrever `pages/ForgotPassword.jsx` em passos (buscar, confirmar conta mascarada, código com reenvio e contagem de 60 s, nova senha com confirmação, volta ao login com a mensagem de sucesso), reCAPTCHA só com `VITE_RECAPTCHA_SITE_KEY`; recolocar a rota `/forgot-password` em `App.jsx`; trocar o link do `Login.jsx` para "Esqueci minha senha". Verificar no navegador cada cenário da spec `auth/forgot-password` (incluindo conta sem e-mail, conta de equipe e conta desativada) e `npm run build` sem erros.

## 7. Frontend: perfil e notificações

- [ ] 7.1 Item "E-mail de recuperação" no menu do perfil (`TopNav.jsx`) e modal com e-mail atual, novo e-mail em dobro e senha atual; oculto para conta de equipe. Verificar no navegador os cenários da spec `auth/recovery-email` e a opção disponível depois de dispensar a notificação.
- [ ] 7.2 Componente de sino em `TopNav.jsx` ao lado do perfil, em todas as contas: contador de não lidas, menu suspenso com lista, abrir marca como lidas, "X" no canto superior direito dispensa, ação abre o modal do 7.1, estado vazio, tema escuro, celular e altura da barra ≤ 1,5 cm. Verificar no navegador com conta principal antiga, conta nova e conta de equipe.
- [ ] 7.3 Atualização em tempo real: assinar `notificacoes_aviso` filtrando pelo usuário no `supabaseClient`, buscar pela API ao receber o aviso, consulta a cada 60 s e recarga ao voltar o foco da aba. Verificar com duas abas: criar/dispensar numa e ver a outra atualizar sem recarregar, e que, com o Realtime desligado, o polling atualiza.

## 8. Integração

- [ ] 8.1 Passagem completa com três contas (principal antiga, principal nova, equipe): cadastro com e-mail de recuperação, notificação na antiga, cadastro do e-mail pelo perfil resolvendo a notificação, recuperação ponta a ponta com o Resend real (e-mail da própria conta Resend), e a conta de equipe orientada ao administrador. Anotar o resultado na conversa.
- [ ] 8.2 Regressão: login, cadastro sem reCAPTCHA configurado, `npm run build` e `npm run lint` sem erros novos, consulta de NF-e, upload de XML e leitor de câmera inalterados, e `openspec validate recuperacao-de-conta-e-notificacoes` sem erros.
