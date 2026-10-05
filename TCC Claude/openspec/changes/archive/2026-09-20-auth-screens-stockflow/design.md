# Design

## Context

Projeto novo, sem código existente. Toda a estrutura de pastas, dependências e configurações será criada do zero. Ver `proposal.md — Why` para a motivação.

Stack definida: React + Tailwind CSS (frontend), Node.js/Express (backend), MySQL/MariaDB (banco), Nodemailer (e-mail), reCAPTCHA v2 (proteção anti-robô).

## Goals / Non-Goals

**Goals:**
- Estrutura inicial de projeto (frontend + backend separados)
- Todas as 5 telas de autenticação funcionais e integradas com a API
- Backend stateless com JWT — sem sessão no servidor
- Fluxo de recuperação de senha completo com código temporário por e-mail
- Dark/light mode com persistência em localStorage
- Logo animada com fundo transparente via CSS

**Non-Goals:**
- Dashboard ou qualquer tela pós-login (fora do escopo desta change)
- OAuth / login social (Google, GitHub etc.)
- Envio de SMS ou verificação por WhatsApp
- Upload de logo do usuário

## Decisions

### 1. Monorepo com pastas `frontend/` e `backend/`

Ambas as partes do projeto ficam no mesmo repositório em pastas separadas, cada uma com seu próprio `package.json`. Alternativa (repos separados) aumentaria a complexidade de deploy para um TCC.

### 2. Tailwind CSS puro (sem shadcn/ui ou Material UI)

Tailwind dá controle total sobre o degradê personalizado e o card do login. Bibliotecas de componentes prontos (shadcn, MUI) exigiriam sobrescrever estilos para atingir o visual aprovado. Risco: mais CSS manual, mas o visual é simples o suficiente para não ser um problema.

### 3. Identificação flexível no login: detecção por regex no backend

O campo identificador do frontend envia o valor como string. O backend detecta o tipo aplicando regex:
- CPF: `/^\d{3}\.\d{3}\.\d{3}-\d{2}$/` (após formatação) ou 11 dígitos
- CNPJ: `/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/` ou 14 dígitos
- Caso contrário: trata como nome da empresa (busca case-insensitive)

### 4. Token de recuperação de senha via JWT temporário (15 min)

Após o usuário inserir o código de 6 dígitos corretamente, o backend emite um JWT de curta duração (15 min, escopo `reset-password`) que o frontend usa na etapa seguinte. Alternativa (manter código no banco até o passo 3) aumentaria o risco de reuso. O JWT é assinado com secret separado do JWT de sessão.

### 5. reCAPTCHA v2 validado no backend

O token gerado pelo widget reCAPTCHA v2 é enviado junto com o formulário e verificado no backend via `https://www.google.com/recaptcha/api/siteverify`. O frontend não toma nenhuma decisão com base nele — apenas o envia. Site key e secret key ficam em variável de ambiente.

### 6. Código de 6 dígitos armazenado com hash no banco

O código não é salvo em texto puro — é hashado com bcrypt antes de persistir, assim como senhas. Coluna `reset_code_hash` + `reset_code_expires_at` na tabela `usuarios`.

### 7. mix-blend-mode para transparência da logo

A logo PNG tem fundo branco. Em vez de exigir um arquivo PNG com canal alpha, aplicar `mix-blend-mode: multiply` (modo claro) e `mix-blend-mode: screen` (modo escuro) remove visualmente o fundo sem editar o arquivo. Isso funciona bem sobre os fundos de degradê aprovados.

## Estrutura de pastas

```
TCC Claude/
├── frontend/
│   ├── public/
│   │   └── logo.png               ← Logo tcc.png copiada
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ForgotPassword.jsx  ← gerencia os 3 passos internamente
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── App.jsx                 ← rotas com react-router-dom
│   ├── tailwind.config.js
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   └── auth.js
│   │   ├── controllers/
│   │   │   └── authController.js
│   │   ├── models/
│   │   │   └── User.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── db.js
│   ├── .env.example
│   └── package.json
└── openspec/
```

## Schema do banco

```sql
CREATE TABLE usuarios (
  id                    INT PRIMARY KEY AUTO_INCREMENT,
  nome                  VARCHAR(150) NOT NULL,
  nome_empresa          VARCHAR(150) NOT NULL,
  cpf_cnpj              VARCHAR(18)  NOT NULL UNIQUE,
  email                 VARCHAR(150) NOT NULL UNIQUE,
  senha_hash            VARCHAR(255) NOT NULL,
  reset_code_hash       VARCHAR(255) NULL,
  reset_code_expires_at DATETIME     NULL,
  ativo                 BOOLEAN      DEFAULT TRUE,
  criado_em             TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
```

## Risks / Trade-offs

- **Nodemailer com Gmail em ambiente de desenvolvimento** → Gmail pode bloquear envios sem App Password configurado. Mitigação: documentar no `.env.example` e usar Mailtrap para testes.
- **reCAPTCHA requer chaves do Google** → O usuário precisa cadastrar o domínio no Google reCAPTCHA Admin. Mitigação: documenta no README e usa `localhost` nas chaves de desenvolvimento.
- **mix-blend-mode em modo escuro** → `multiply` não funciona bem em fundo escuro; `screen` funciona melhor. A implementação usa classe CSS condicional baseada no tema ativo.
- **JWT de sessão no localStorage** → Vulnerável a XSS. Para TCC é aceitável; em produção real usaria httpOnly cookie. Registrado aqui para a banca.

## Open Questions

- Qual provedor de e-mail usar em produção? (Gmail App Password, SendGrid, etc.) — pode ser definido após a implementação básica.
