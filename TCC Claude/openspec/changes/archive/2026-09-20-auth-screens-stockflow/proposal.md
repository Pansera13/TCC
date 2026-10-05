# Proposal

## Why

O StockFlow é um sistema de estoque web para TCC que ainda não possui nenhuma tela implementada. A autenticação é o ponto de entrada obrigatório do sistema — sem ela nenhuma outra funcionalidade pode ser acessada de forma segura.

## What Changes

- Adicionar tela de **Login** com identificação por nome de empresa, CNPJ ou CPF, senha, dark/light mode, logo animada e rodapé com links sociais
- Adicionar tela de **Cadastro** com campos completos de pessoa física/jurídica e reCAPTCHA v2
- Adicionar fluxo de **Recuperação de Senha** em 3 passos: identificação → código por e-mail → nova senha, com reCAPTCHA v2 no primeiro passo
- Adicionar backend de autenticação com rotas REST, senhas hashadas (bcrypt) e tokens JWT
- Configurar conexão com banco MySQL e tabela `usuarios`

## Capabilities

### New Capabilities

- `auth/login`: Tela de login com identificador flexível (nome da empresa, CNPJ ou CPF), campo de senha, alternador dark/light mode, logo animada com float suave, links "Esqueci a senha" e "Cadastrar-se", botão ENTRAR com gradiente, rodapé com ícones do GitHub, LinkedIn e WhatsApp
- `auth/register`: Tela de cadastro com campos nome completo, nome da empresa, CPF ou CNPJ (formatação automática), e-mail, senha, confirmar senha e reCAPTCHA v2
- `auth/forgot-password`: Fluxo de recuperação de senha em 3 passos — passo 1: e-mail + CPF/CNPJ + reCAPTCHA; passo 2: código de 6 dígitos enviado por e-mail com countdown de reenvio; passo 3: nova senha + confirmar
- `auth/backend`: API REST de autenticação com rotas POST /api/auth/login, /api/auth/register, /api/auth/forgot-password, /api/auth/verify-code, /api/auth/reset-password; bcrypt para senhas, JWT para sessões, conexão MySQL

### Modified Capabilities

_(nenhuma — projeto novo, sem specs existentes)_

## Impact

- **Frontend**: Novas páginas React (`Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`), contexto de autenticação (`AuthContext.jsx`), serviço de API (`api.js`), configuração de rotas protegidas
- **Backend**: Estrutura inicial Node.js/Express (`server.js`, `routes/auth.js`, `controllers/authController.js`, `models/User.js`, `middleware/auth.js`, `db.js`)
- **Banco de dados**: Tabela `usuarios` (id, nome, nome_empresa, cpf_cnpj, email, senha_hash, ativo, criado_em)
- **Dependências novas**: `bcrypt`, `jsonwebtoken`, `mysql2`, `nodemailer` (backend); `react-google-recaptcha`, `react-router-dom`, `tailwindcss` (frontend)
- **Assets**: Logo `Logo tcc.png` copiada para `frontend/public/`
