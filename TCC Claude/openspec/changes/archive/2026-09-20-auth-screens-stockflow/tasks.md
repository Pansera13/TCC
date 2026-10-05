# Tasks

## 1. Estrutura inicial do projeto

- [x] 1.1 Criar pasta `backend/` com `package.json` e instalar dependências (`express`, `bcrypt`, `jsonwebtoken`, `mysql2`, `nodemailer`, `cors`, `dotenv`, `axios`) — verificar que `node_modules/` é gerado sem erros
- [x] 1.2 Criar pasta `frontend/` com projeto React via Vite e instalar dependências (`tailwindcss`, `react-router-dom`, `react-google-recaptcha`, `axios`) — verificar que `npm run dev` inicia sem erros
- [x] 1.3 Configurar Tailwind CSS no frontend (`tailwind.config.js`, `postcss.config.js`, importar no `index.css`) — verificar que classe `bg-white` é reconhecida no browser
- [x] 1.4 Criar `backend/.env.example` com variáveis `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET`, `JWT_RESET_SECRET`, `RECAPTCHA_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `PORT` e copiar para `.env` com valores de desenvolvimento
- [x] 1.5 Copiar `Logo tcc.png` de `C:\Users\lucas\Documents\TCC\` para `frontend/public/logo.png` — verificar que o arquivo é acessível em `http://localhost:5173/logo.png`

## 2. Banco de dados

- [x] 2.1 Criar arquivo `backend/src/db.js` com conexão MySQL usando `mysql2/promise` e variáveis do `.env` — verificar que o servidor conecta ao MySQL sem erro no console
- [x] 2.2 Criar script `backend/src/createTable.js` com o SQL de criação da tabela `usuarios` (conforme design.md — Schema do banco) — verificar que a tabela é criada com `node src/createTable.js`

## 3. Backend — rotas de autenticação

- [x] 3.1 Criar `backend/src/models/User.js` com funções `findByIdentifier(value)`, `findByEmail(email)`, `create(data)`, `updateResetCode(id, hash, expires)`, `updatePassword(id, hash)` — verificar que as funções executam queries sem erro com dados de teste
- [x] 3.2 Criar `backend/src/middleware/auth.js` com middleware JWT que valida `Authorization: Bearer <token>` e retorna 401 em token ausente/inválido — verificar comportamento com token válido e inválido
- [x] 3.3 Criar `backend/src/controllers/authController.js` com função `register`: valida campos, verifica duplicidade de e-mail e CPF/CNPJ, faz hash da senha com bcrypt e salva — verificar HTTP 201 em sucesso e 409 em duplicidade
- [x] 3.4 Adicionar função `login` no controller: detecta tipo do identificador por regex, busca usuário, compara senha com bcrypt, emite JWT de 8h — verificar HTTP 200 com token em sucesso e 401 em falha
- [x] 3.5 Adicionar função `forgotPassword` no controller: valida e-mail + CPF/CNPJ, gera código de 6 dígitos, salva hash + expiração de 15min no banco, envia e-mail via Nodemailer — verificar HTTP 200 em qualquer caso e e-mail recebido em caso de dados válidos
- [x] 3.6 Adicionar função `verifyCode` no controller: compara código com hash no banco, verifica expiração, emite JWT temporário com escopo `reset-password` (15min) — verificar HTTP 200 com token em código válido e 400 em inválido/expirado
- [x] 3.7 Adicionar função `resetPassword` no controller: valida JWT de reset, atualiza senha com novo hash bcrypt, invalida código (zera `reset_code_hash` e `reset_code_expires_at`) — verificar HTTP 200 em sucesso e 400 em token inválido
- [x] 3.8 Criar `backend/src/routes/auth.js` com as 5 rotas POST e criar `backend/src/server.js` com Express, CORS e montagem das rotas em `/api/auth` — verificar que `node src/server.js` responde em `http://localhost:3001/api/auth/login`

## 4. Frontend — contexto e serviço de API

- [x] 4.1 Criar `frontend/src/services/api.js` com instância Axios apontando para `http://localhost:3001` e funções `login`, `register`, `forgotPassword`, `verifyCode`, `resetPassword` — verificar que as chamadas chegam ao backend no console de rede
- [x] 4.2 Criar `frontend/src/context/AuthContext.jsx` com estado do usuário, token JWT (salvo em localStorage), funções `loginUser` e `logoutUser` e provider — verificar que `useAuth()` retorna os valores corretos em componentes filhos

## 5. Frontend — roteamento e tema

- [x] 5.1 Criar `frontend/src/App.jsx` com `BrowserRouter` e rotas: `/` → Login, `/register` → Register, `/forgot-password` → ForgotPassword, rota protegida `/dashboard` → placeholder — verificar que navegação entre rotas funciona
- [x] 5.2 Implementar lógica de dark/light mode em `App.jsx`: ler preferência de `localStorage` na montagem, salvar ao alternar, aplicar classe `dark` na tag `<html>` para ativar as cores do Tailwind dark mode — verificar que a preferência persiste entre reloads

## 6. Frontend — tela de Login

- [x] 6.1 Criar `frontend/src/pages/Login.jsx` com estrutura base: fundo full-screen com degradê via Tailwind (`from-white to-[#E879F9]` modo claro, `dark:from-black dark:to-[#7C3AED]`), card centralizado com bordas arredondadas e sombra — verificar visual no browser em modo claro e escuro
- [x] 6.2 Adicionar logo animada acima do card: `<img src="/logo.png">` com animação CSS `float` (keyframe: `translateY(-8px) ↔ translateY(8px)`, 3s, ease-in-out, infinite) e `mix-blend-mode: multiply` (claro) / `dark:mix-blend-mode: screen` (escuro) — verificar que o fundo branco da logo desaparece em ambos os modos
- [x] 6.3 Adicionar título "StockFlow" abaixo da logo e campos do formulário: identificador (com formatação automática de CPF/CNPJ via `onChange`) e senha com botão mostrar/ocultar — verificar formatação ao digitar CPF e CNPJ
- [x] 6.4 Adicionar linha com link "Esqueci a senha" (navega para `/forgot-password`) à esquerda e "Cadastrar-se" (navega para `/register`) à direita, botão ENTRAR com gradiente e estado de loading — verificar navegação dos links e estado do botão durante requisição
- [x] 6.5 Integrar submissão com `authController.login` via `api.js`: em sucesso salvar token e redirecionar para `/dashboard`; em erro exibir mensagem "Usuário ou senha inválidos" — verificar fluxo completo com usuário de teste no banco
- [x] 6.6 Adicionar botão alternador dark/light no canto superior direito da página e rodapé inferior esquerdo com três ícones (GitHub, LinkedIn, WhatsApp) abrindo links em nova aba — verificar alternância e abertura dos links

## 7. Frontend — tela de Cadastro

- [x] 7.1 Criar `frontend/src/pages/Register.jsx` com mesma base visual do Login, campos: nome completo, nome da empresa, CPF/CNPJ (formatação automática), e-mail, senha, confirmar senha — verificar que todos os campos renderizam corretamente
- [x] 7.2 Adicionar validação de formulário: campos obrigatórios, formato de e-mail, senhas iguais — verificar que mensagens de erro aparecem nos campos corretos antes do envio
- [x] 7.3 Adicionar widget reCAPTCHA v2 (`react-google-recaptcha`) com site key do `.env` e lógica de habilitar/desabilitar o botão CADASTRAR — verificar que botão só habilita após completar o CAPTCHA
- [x] 7.4 Integrar submissão com `api.register`: em sucesso redirecionar para `/` com mensagem "Conta criada com sucesso!"; em erro 409 exibir campo duplicado — verificar fluxo completo

## 8. Frontend — tela de Recuperação de Senha

- [x] 8.1 Criar `frontend/src/pages/ForgotPassword.jsx` com estado `step` (1, 2 ou 3) controlando qual passo é exibido — verificar que a troca de steps funciona sem reload
- [x] 8.2 Implementar Passo 1: campos e-mail e CPF/CNPJ, reCAPTCHA v2, botão AVANÇAR — integrar com `api.forgotPassword` e avançar para step 2 em HTTP 200 — verificar envio de e-mail em ambiente de desenvolvimento
- [x] 8.3 Implementar Passo 2: e-mail mascarado (ex: `l***@gmail.com`), 6 inputs de dígito com foco automático entre eles (via `ref` e `onInput`), contador regressivo 59s com opção de reenvio, botão CONFIRMAR — integrar com `api.verifyCode` e salvar token temporário — verificar foco automático e countdown
- [x] 8.4 Implementar Passo 3: campos nova senha e confirmar nova senha, botão SALVAR SENHA — integrar com `api.resetPassword` usando token temporário; em sucesso redirecionar para `/` com mensagem "Senha alterada com sucesso!" — verificar fluxo completo de ponta a ponta

## 9. Verificação de integração

- [x] 9.1 Testar fluxo completo de cadastro: preencher todos os campos, completar CAPTCHA, verificar usuário criado no banco MySQL
- [x] 9.2 Testar fluxo completo de login com cada tipo de identificador (nome da empresa, CPF, CNPJ) e verificar redirecionamento para dashboard
- [x] 9.3 Testar fluxo completo de recuperação de senha: passo 1 → receber e-mail com código → passo 2 → passo 3 → login com nova senha
- [x] 9.4 Verificar dark mode em todas as telas: degradê, card, textos e logo com mix-blend-mode correto em fundo escuro
