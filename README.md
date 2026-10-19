# TCC

Sistema com dois projetos que compartilham o mesmo banco no Supabase:

- **TCC Claude** – Estoque (`backend` + `frontend`)
- **TCC PEDIDOS** – Pedidos (`frontend`)

## Pré-requisitos (instalar na máquina)

| Ferramenta | Versão recomendada | Para quê |
|---|---|---|
| [Node.js](https://nodejs.org/) (inclui o `npm`) | 20 LTS ou superior | Rodar backend e frontends |
| [Git](https://git-scm.com/) | qualquer recente | Clonar o repositório |
| Conta no [Supabase](https://supabase.com/) | – | Banco PostgreSQL e autenticação |
| Chave do [Google reCAPTCHA](https://www.google.com/recaptcha/) | – | Usada no frontend do Estoque (`react-google-recaptcha`) |

> Para o `bcrypt` (backend) o `npm install` baixa o binário pronto; se falhar no Windows, instale as
> [Build Tools do Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) e o Python 3.

## Instalação das dependências

Clone o repositório e rode `npm install` em cada pasta:

```bash
git clone <url-do-repositorio>
cd TCC

cd "TCC Claude/backend"  && npm install && cd ../..
cd "TCC Claude/frontend" && npm install && cd ../..
cd "TCC PEDIDOS/frontend" && npm install && cd ../..
```

### TCC Claude / backend (Estoque – API)

Dependências:

| Pacote | Uso |
|---|---|
| `axios` | Requisições HTTP |
| `bcrypt` | Hash de senhas |
| `cors` | CORS da API |
| `dotenv` | Variáveis de ambiente (`.env`) |
| `express` | Servidor HTTP |
| `jsonwebtoken` | Autenticação via JWT |
| `multer` | Upload do XML da NF-e |
| `nodemailer` | Envio de e-mails (recuperação de senha) |
| `pg` | Conexão com PostgreSQL (Supabase) |
| `xml2js` | Leitura de XML de NF-e |

Dependência de desenvolvimento:

| Pacote | Uso |
|---|---|
| `mysql2` | Apenas para o script de migração `migrarMysqlParaSupabase.js` |

Comandos de instalação individuais (equivalentes ao `npm install`):

```bash
npm install axios bcrypt cors dotenv express jsonwebtoken multer nodemailer pg xml2js
npm install -D mysql2
```

### TCC Claude / frontend (Estoque – Interface)

Dependências:

| Pacote | Uso |
|---|---|
| `react`, `react-dom` | Interface |
| `react-router-dom` | Rotas |
| `@supabase/supabase-js` | Cliente Supabase |
| `axios` | Requisições à API |
| `html5-qrcode` | Leitura de QR Code (NF-e) |
| `react-google-recaptcha` | reCAPTCHA |
| `tailwindcss`, `@tailwindcss/vite` | Estilização |

Dependências de desenvolvimento: `vite`, `@vitejs/plugin-react`, `@vitejs/plugin-basic-ssl`, `oxlint`, `@types/react`, `@types/react-dom`.

### TCC PEDIDOS / frontend (Pedidos – Interface)

Dependências: `react`, `react-dom`, `react-router-dom`, `@supabase/supabase-js`.

Dependências de desenvolvimento: `vite`, `@vitejs/plugin-react`, `oxlint`, `@types/react`, `@types/react-dom`.

## Configuração

1. Crie o projeto no Supabase e rode as migrations SQL (veja `TCC PEDIDOS/SETUP-SUPABASE.md`).
2. Crie os arquivos `.env` (o do backend do Estoque tem exemplo em `TCC Claude/backend/.env.example.supabase`):
   - `TCC Claude/backend/.env` – `DATABASE_URL` e demais variáveis (JWT, e-mail etc.)
   - `TCC Claude/frontend/.env` e `TCC PEDIDOS/frontend/.env` – `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## Executando

| Projeto | Comando | Porta |
|---|---|---|
| Estoque – backend | `npm run dev` (em `TCC Claude/backend`) | 3001 |
| Estoque – frontend | `npm run dev` (em `TCC Claude/frontend`) | 5173 |
| Pedidos – frontend | `npm run dev -- --port 5174` (em `TCC PEDIDOS/frontend`) | 5174 |
